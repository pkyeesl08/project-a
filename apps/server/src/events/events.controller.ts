import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  /** 진행 중 이벤트 목록 */
  @Get('active')
  async getActiveEvents(@Query('regionId') regionId?: string) {
    return ok(await this.eventsService.getActiveEvents(regionId));
  }

  /** 이벤트 랭킹 */
  @Get(':eventId/rankings')
  async getEventRankings(
    @Param('eventId') eventId: string,
    @Query('limit') limit = '50',
  ) {
    return ok(await this.eventsService.getEventRankings(eventId, +limit));
  }

  /** 내 이벤트 순위 */
  @Get(':eventId/my-rank')
  @UseGuards(JwtAuthGuard)
  async getMyRank(
    @Param('eventId') eventId: string,
    @CurrentUserId() userId: string,
  ) {
    return ok(await this.eventsService.getMyEventRank(eventId, userId));
  }

  /** 이벤트 생성 (관리자) */
  @Post()
  async createEvent(@Body() body: {
    regionId: string;
    title: string;
    description: string;
    gameType?: string;
    startAt: string;
    endAt: string;
    topN?: number;
    rewardElo?: number;
  }) {
    return ok(await this.eventsService.createEvent({
      ...body,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
    }));
  }

  /** 이벤트 종료 및 보상 지급 (관리자) */
  @Post(':eventId/finalize')
  async finalizeEvent(@Param('eventId') eventId: string) {
    return ok(await this.eventsService.finalizeEvent(eventId));
  }
}
