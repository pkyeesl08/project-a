import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceEntity, ATTENDANCE_REWARDS } from './attendance.entity';
import { AvatarService } from '../avatar/avatar.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceEntity)
    private attendanceRepo: Repository<AttendanceEntity>,
    private avatarService: AvatarService,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private yesterday(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  /** 오늘 출석 체크 — 이미 했으면 기존 기록 반환 */
  async checkIn(userId: string) {
    const today = this.today();

    // 오늘 이미 체크인했으면 현황 반환
    const existing = await this.attendanceRepo.findOne({
      where: { userId, checkDate: today },
    });
    if (existing) {
      return { alreadyChecked: true, ...this.formatRecord(existing) };
    }

    // 어제 체크인 여부로 streak 계산
    const yesterdayRecord = await this.attendanceRepo.findOne({
      where: { userId, checkDate: this.yesterday() },
    });

    const prevStreak = yesterdayRecord?.streak ?? 0;
    const newStreak = prevStreak + 1;
    const cycleDay = ((newStreak - 1) % 7) + 1; // 1~7 순환
    const rewards = ATTENDANCE_REWARDS[cycleDay];

    // 보상 지급
    await Promise.allSettled([
      rewards.coins ? this.avatarService.addCoins(userId, rewards.coins) : Promise.resolve(),
      rewards.gems  ? this.avatarService.addGems(userId, rewards.gems)   : Promise.resolve(),
    ]);

    const record = await this.attendanceRepo.save(
      this.attendanceRepo.create({
        userId,
        checkDate: today,
        streak: newStreak,
        cycleDay,
        rewards,
      }),
    );

    return { alreadyChecked: false, ...this.formatRecord(record) };
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
