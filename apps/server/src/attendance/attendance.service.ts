import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceEntity, ATTENDANCE_REWARDS } from './attendance.entity';
import { AvatarService } from '../avatar/avatar.service';
import { UsersService } from '../users/users.service';
import { DnaService } from '../dna/dna.service';

/** 출석 체크인 시 지급 계정 XP */
const XP_PER_CHECKIN = 30;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceEntity)
    private attendanceRepo: Repository<AttendanceEntity>,
    private avatarService: AvatarService,
    private usersService: UsersService,
    private dnaService: DnaService,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private yesterday(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  /** 오늘 출석 체크 — Race Condition 방지: INSERT ... ON CONFLICT DO NOTHING 사용 */
  async checkIn(userId: string) {
    const today = this.today();

    // 어제 체크인 여부로 streak 계산 (INSERT 전에 계산)
    const yesterdayRecord = await this.attendanceRepo.findOne({
      where: { userId, checkDate: this.yesterday() },
    });

    const prevStreak = yesterdayRecord?.streak ?? 0;
    const newStreak = prevStreak + 1;
    const cycleDay = ((newStreak - 1) % 7) + 1; // 1~7 순환
    const rewards = ATTENDANCE_REWARDS[cycleDay];

    // 원자적 INSERT — (userId, checkDate) 유니크 제약으로 Race Condition 방지
    // 동시 요청 시 한 번만 삽입되고, 이미 존재하면 orIgnore()로 무시
    const insertResult = await this.attendanceRepo
      .createQueryBuilder()
      .insert()
      .into('attendance')
      .values({ userId, checkDate: today, streak: newStreak, cycleDay, rewards })
      .orIgnore()
      .execute();

    if (insertResult.identifiers.length === 0) {
      // 이미 체크인됨 (중복 요청 포함) — 보상 미지급
      const existing = await this.attendanceRepo.findOne({ where: { userId, checkDate: today } });
      return { alreadyChecked: true, ...this.formatRecord(existing!) };
    }

    // 삽입 성공 → 보상 지급 (한 번만 실행됨)
    // 🌟 파티 DNA 5pt 이상 → 코인/XP 1.5배 보너스
    const dnaBonus = await this.dnaService.getAttendanceBonus(userId);
    const bonusCoins = rewards.coins ? Math.round(rewards.coins * dnaBonus) : 0;
    const bonusXp   = Math.round(XP_PER_CHECKIN * dnaBonus);
    await Promise.allSettled([
      bonusCoins ? this.avatarService.addCoins(userId, bonusCoins) : Promise.resolve(),
      rewards.gems  ? this.avatarService.addGems(userId, rewards.gems)   : Promise.resolve(),
      this.usersService.addXp(userId, bonusXp),  // 계정 XP (+30 기본, DNA 보너스 적용)
    ]);

    const record = await this.attendanceRepo.findOne({ where: { userId, checkDate: today } });
    return { alreadyChecked: false, ...this.formatRecord(record!) };
  }

  /** 이번 주(월~일) 출석 현황 + 오늘 체크인 여부 */
  async getStatus(userId: string) {
    const today = this.today();

    // 최근 14일 기록 조회 (이번 주 달력 렌더링용)
    const recent = await this.attendanceRepo.find({
      where: { userId },
      order: { checkDate: 'DESC' },
      take: 14,
    });

    const checkedDates = new Set(recent.map(r => r.checkDate));
    const todayRecord = recent.find(r => r.checkDate === today);
    const latestStreak = recent[0]?.streak ?? 0;

    // 이번 주 월요일 기준 7일 캘린더
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=월요일
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);

    const weekCalendar = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        dayLabel: ['월', '화', '수', '목', '금', '토', '일'][i],
        checked: checkedDates.has(dateStr),
        isToday: dateStr === today,
        reward: ATTENDANCE_REWARDS[i + 1],
      };
    });

    // 오늘 체크인 안 했으면 다음 보상 미리보기
    const currentStreak = todayRecord ? latestStreak : (latestStreak > 0 && recent[0]?.checkDate === this.yesterday() ? latestStreak : 0);
    const nextCycleDay = ((currentStreak) % 7) + 1; // 다음에 받을 보상
    const nextReward = !todayRecord ? ATTENDANCE_REWARDS[nextCycleDay] : null;

    return {
      checkedInToday: !!todayRecord,
      streak: todayRecord ? latestStreak : (recent[0]?.checkDate === this.yesterday() ? latestStreak : 0),
      weekCalendar,
      nextReward: nextReward ? { ...nextReward, cycleDay: nextCycleDay } : null,
      todayRewards: todayRecord ? todayRecord.rewards : null,
    };
  }

  private formatRecord(record: AttendanceEntity) {
    return {
      streak: record.streak,
      cycleDay: record.cycleDay,
      rewards: record.rewards,
    };
  }
}
