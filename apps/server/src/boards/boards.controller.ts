import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { BoardsService } from './boards.service';
import { BoardCategory } from './board-post.entity';
import { ok } from '../common/response';

@Controller('api/boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  /* ── 게시글 목록 ── */

  @Get()
  async getPosts(
    @Query('category') category?: BoardCategory,
    @Query('regionId') regionId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return ok(await this.boardsService.getPosts({
      category,
      regionId,
      page: parseInt(page),
      limit: parseInt(limit),
    }));
  }

  /* ── 게시글 상세 ── */

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return ok(await this.boardsService.getPost(id));
  }

  /* ── 게시글 작성 ── */

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPost(
    @CurrentUserId() userId: string,
    @Body() body: {
      category: BoardCategory;
      regionId?: string;
      title: string;
      content: string;
      gameType?: string;
      maxPlayers?: number;
    },
  ) {
    return ok(await this.boardsService.createPost(userId, body));
  }

  /* ── 게시글 삭제 ── */

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePost(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return ok(await this.boardsService.deletePost(id, userId));
  }

  /* ── 파티 참가 ── */

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async joinParty(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return ok(await this.boardsService.joinParty(id, userId));
  }

  /* ── 파티 탈퇴 ── */

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  async leaveParty(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return ok(await this.boardsService.leaveParty(id, userId));
  }

  /* ── 댓글 목록 ── */

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return ok(await this.boardsService.getComments(id));
  }

  /* ── 댓글 작성 ── */

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() body: { content: string },
  ) {
    return ok(await this.boardsService.createComment(id, userId, body.content));
  }

  /* ── 댓글 삭제 ── */

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUserId() userId: string,
  ) {
    return ok(await this.boardsService.deleteComment(commentId, userId));
  }
}
