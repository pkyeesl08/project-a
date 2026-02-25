import {
  Controller, Get, Patch, Post, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { DnaService } from './dna.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dna')
@UseGuards(JwtAuthGuard)
export class DnaController {
  constructor(private readonly dnaService: DnaService) {}

  /** 내 DNA 상태 조회 */
  @Get()
  getStatus(@Request() req: any) {
    return this.dnaService.getStatus(req.user.id);
  }

  /** 포인트 배분 (전체 재배치) */
  @Patch()
  allocate(
    @Request() req: any,
    @Body() body: { reaction: number; puzzle: number; action: number; precision: number; party: number },
  ) {
    return this.dnaService.allocate(req.user.id, body);
  }

  /** 무료 리셋 (월 1회) */
  @Post('reset/free')
  resetFree(@Request() req: any) {
    return this.dnaService.resetFree(req.user.id);
  }

  /** 보석 리셋 (80💎) */
  @Post('reset/gems')
  resetWithGems(@Request() req: any) {
    return this.dnaService.resetWithGems(req.user.id);
  }

  /** ELO 쉴드 토큰 활성화 */
  @Post('tokens/elo-shield')
  activateEloShield(@Request() req: any) {
    return this.dnaService.activateEloShield(req.user.id);
  }

  /** 더블업 토큰 활성화 */
  @Post('tokens/double-up')
  activateDoubleUp(@Request() req: any) {
    return this.dnaService.activateDoubleUp(req.user.id);
  }

  /** 베스트픽 세션 시작 */
  @Post('tokens/best-pick')
  activateBestPick(@Request() req: any) {
    return this.dnaService.activateBestPick(req.user.id);
  }

  /** 게임 플레이 전 강화 정보 조회 */
  @Get('enhancements')
  getEnhancements(
    @Request() req: any,
    @Query('gameCategory') gameCategory?: string,
  ) {
    return this.dnaService.getEnhancementsForGame(req.user.id, gameCategory ?? '');
  }
}
