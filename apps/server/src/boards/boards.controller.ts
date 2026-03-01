import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
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
    @Query('q') q?: string,
  ) {
    return ok(await this.boardsService.getPosts({
      category,
      regionId,
      page: parseInt(page),
      limit: parseInt(limit),
      q,
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

  /* ── 댓글 수정 (※ ':id' 패턴보다 반드시 먼저 등록해야 라우트 충돌 방지) ── */

  @Patch('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param('commentId') commentId: string,
    @CurrentUserId() userId: string,
    @Body() body: { content: string },
  ) {
    return ok(await this.boardsService.updateComment(commentId, userId, body.content));
  }

  /* ── 게시글 수정 ── */

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() body: { title: string; content: string },
  ) {
    return ok(await this.boardsService.updatePost(id, userId, body));
  }

  /* ── 좋아요 / 취소 ── */

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return ok(await this.boardsService.likePost(id, userId));
  }

  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlikePost(@Param('id') id: string, @CurrentUserId() userId: string) {
    return ok(await this.boardsService.unlikePost(id, userId));
  }

  /* ── 신고 ── */

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  async reportPost(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() body: { reason: string },
  ) {
    return ok(await this.boardsService.reportPost(id, userId, body.reason));
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
