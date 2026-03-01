import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  /** 오늘 출석 체크 + 보상 수령 */
  @Post('check-in')
  async checkIn(@CurrentUserId() userId: string) {
    return ok(await this.service.checkIn(userId));
  }

  /** 이번 주 출석 현황 + 다음 보상 미리보기 */
  @Get('status')
  async getStatus(@CurrentUserId() userId: string) {
    return ok(await this.service.getStatus(userId));
  }
}
