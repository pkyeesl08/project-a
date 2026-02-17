import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { VerifySchoolDto } from '../common/dto';
import { ok, fail } from '../common/response';

@Controller('users/school')
export class SchoolsController {
  constructor(private schoolsService: SchoolsService) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verify(@CurrentUserId() userId: string, @Body() dto: VerifySchoolDto) {
    if (dto.email)    return ok(await this.schoolsService.verifyByEmail(userId, dto.email));
    if (dto.schoolId) return ok(await this.schoolsService.verifyBySchoolId(userId, dto.schoolId));
    return fail('INVALID', 'email 또는 schoolId가 필요합니다.');
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return ok(await this.schoolsService.search(query || ''));
  }
}
