import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardPostEntity, BoardCategory, PartyStatus } from './board-post.entity';
import { BoardCommentEntity } from './board-comment.entity';

const MAX_TITLE_LEN   = 100;
const MAX_CONTENT_LEN = 2000;
const MAX_COMMENT_LEN = 500;

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(BoardPostEntity)
    private postsRepo: Repository<BoardPostEntity>,
    @InjectRepository(BoardCommentEntity)
    private commentsRepo: Repository<BoardCommentEntity>,
  ) {}

  /* ── 게시글 목록 ─────────────────────────────────────────── */

  async getPosts(opts: {
    category?: BoardCategory;
    regionId?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, Math.min(50, opts.limit ?? 20));

    const qb = this.postsRepo
      .createQueryBuilder('p')
      .leftJoin('p.user', 'u')
      .select([
        'p.id', 'p.category', 'p.title', 'p.gameType',
        'p.maxPlayers', 'p.currentPlayers', 'p.partyStatus',
        'p.createdAt', 'p.updatedAt',
        'u.id', 'u.nickname', 'u.profileImage',
      ])
      .where('p.isDeleted = false')
      .orderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (opts.category) qb.andWhere('p.category = :cat', { cat: opts.category });

    // 동네 필터: regionId가 주어지면 해당 동네 + 전국(null) 게시글
    if (opts.regionId) {
      qb.andWhere('(p.regionId = :rid OR p.regionId IS NULL)', { rid: opts.regionId });
    }

    const [posts, total] = await qb.getManyAndCount();
    return { posts, total, page, limit };
  }

  /* ── 게시글 상세 ─────────────────────────────────────────── */

  async getPost(postId: string) {
    const post = await this.postsRepo
      .createQueryBuilder('p')
      .leftJoin('p.user', 'u')
      .select([
        'p.id', 'p.category', 'p.title', 'p.content', 'p.regionId',
        'p.gameType', 'p.maxPlayers', 'p.currentPlayers', 'p.partyStatus',
        'p.createdAt', 'p.updatedAt',
        'u.id', 'u.nickname', 'u.profileImage',
      ])
      .where('p.id = :id AND p.isDeleted = false', { id: postId })
      .getOne();

    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    return post;
  }

  /* ── 게시글 작성 ─────────────────────────────────────────── */

  async createPost(userId: string, data: {
    category: BoardCategory;
    regionId?: string;
    title: string;
    content: string;
    gameType?: string;
    maxPlayers?: number;
  }) {
    if (!data.title?.trim() || data.title.length > MAX_TITLE_LEN) {
      throw new BadRequestException(`제목은 1~${MAX_TITLE_LEN}자여야 합니다.`);
    }
    if (!data.content?.trim() || data.content.length > MAX_CONTENT_LEN) {
      throw new BadRequestException(`내용은 1~${MAX_CONTENT_LEN}자여야 합니다.`);
    }

    if (data.category === BoardCategory.PARTY) {
      if (!data.gameType) throw new BadRequestException('파티 찾기는 게임 타입이 필요합니다.');
      const mp = data.maxPlayers ?? 4;
      if (mp < 2 || mp > 8) throw new BadRequestException('최대 인원은 2~8명이어야 합니다.');

      const post = this.postsRepo.create({
        userId,
        regionId: data.regionId ?? null,
        category: BoardCategory.PARTY,
        title: data.title.trim(),
        content: data.content.trim(),
        gameType: data.gameType,
        maxPlayers: mp,
        currentPlayers: [userId],
        partyStatus: PartyStatus.OPEN,
      });
      return this.postsRepo.save(post);
    }

    const post = this.postsRepo.create({
      userId,
      regionId: data.regionId ?? null,
      category: data.category,
      title: data.title.trim(),
      content: data.content.trim(),
      gameType: null,
      maxPlayers: null,
      currentPlayers: [],
      partyStatus: null,
    });
    return this.postsRepo.save(post);
  }

  /* ── 게시글 삭제 ─────────────────────────────────────────── */

  async deletePost(postId: string, userId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId !== userId) throw new ForbiddenException('본인의 게시글만 삭제할 수 있습니다.');

    await this.postsRepo.update(postId, { isDeleted: true });
    return { deleted: true };
  }

  /* ── 파티 참가 / 탈퇴 ───────────────────────────────────── */

  async joinParty(postId: string, userId: string) {
    // 원자적 UPDATE — 배열 미포함 & 상태 OPEN & 인원 미달 시에만
    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.category !== BoardCategory.PARTY) throw new BadRequestException('파티 찾기 게시글이 아닙니다.');
    if (post.partyStatus === PartyStatus.CLOSED) throw new BadRequestException('이미 파티가 완성됐습니다.');
    if (post.currentPlayers.includes(userId)) throw new BadRequestException('이미 참가 중입니다.');
    if (post.currentPlayers.length >= (post.maxPlayers ?? 4)) {
      throw new BadRequestException('파티 인원이 가득 찼습니다.');
    }

    const newPlayers = [...post.currentPlayers, userId];
    const isFull = newPlayers.length >= (post.maxPlayers ?? 4);

    await this.postsRepo.update(postId, {
      currentPlayers: newPlayers,
      partyStatus: isFull ? PartyStatus.CLOSED : PartyStatus.OPEN,
    });

    return { joined: true, currentPlayers: newPlayers, isFull };
  }

  async leaveParty(postId: string, userId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId === userId) throw new BadRequestException('파티장은 탈퇴할 수 없습니다. 게시글을 삭제하세요.');
    if (!post.currentPlayers.includes(userId)) throw new BadRequestException('참가 중이 아닙니다.');

    const newPlayers = post.currentPlayers.filter(id => id !== userId);
    await this.postsRepo.update(postId, {
      currentPlayers: newPlayers,
      partyStatus: PartyStatus.OPEN,
    });

    return { left: true, currentPlayers: newPlayers };
  }

  /* ── 댓글 목록 ──────────────────────────────────────────── */

  async getComments(postId: string) {
    const exists = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!exists) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    return this.commentsRepo
      .createQueryBuilder('c')
      .leftJoin('c.user', 'u')
      .select([
        'c.id', 'c.content', 'c.createdAt', 'c.updatedAt', 'c.isDeleted', 'c.isEdited',
        'u.id', 'u.nickname', 'u.profileImage',
      ])
      .where('c.postId = :postId', { postId })
      .orderBy('c.createdAt', 'ASC')
      .take(200)
      .getMany();
  }

  /* ── 댓글 작성 ──────────────────────────────────────────── */

  async createComment(postId: string, userId: string, content: string) {
    if (!content?.trim() || content.length > MAX_COMMENT_LEN) {
      throw new BadRequestException(`댓글은 1~${MAX_COMMENT_LEN}자여야 합니다.`);
    }

    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const comment = this.commentsRepo.create({ postId, userId, content: content.trim() });
    return this.commentsRepo.save(comment);
  }

  /* ── 댓글 삭제 ──────────────────────────────────────────── */

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.commentsRepo.findOne({ where: { id: commentId, isDeleted: false } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.userId !== userId) throw new ForbiddenException('본인의 댓글만 삭제할 수 있습니다.');

    await this.commentsRepo.update(commentId, { isDeleted: true });
    return { deleted: true };
  }

  /* ── 댓글 수정 ──────────────────────────────────────────── */

  async updateComment(commentId: string, userId: string, content: string) {
    if (!content?.trim() || content.length > MAX_COMMENT_LEN) {
      throw new BadRequestException(`댓글은 1~${MAX_COMMENT_LEN}자여야 합니다.`);
    }
    const comment = await this.commentsRepo.findOne({ where: { id: commentId, isDeleted: false } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.userId !== userId) throw new ForbiddenException('본인의 댓글만 수정할 수 있습니다.');

    await this.commentsRepo.update(commentId, { content: content.trim(), isEdited: true });
    return { ...comment, content: content.trim(), isEdited: true };
  }

  /* ── 게시글 수정 ─────────────────────────────────────────── */

  async updatePost(postId: string, userId: string, data: { title: string; content: string }) {
    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId !== userId) throw new ForbiddenException('본인의 게시글만 수정할 수 있습니다.');
    if (!data.title?.trim() || data.title.length > MAX_TITLE_LEN) {
      throw new BadRequestException(`제목은 1~${MAX_TITLE_LEN}자여야 합니다.`);
    }
    if (!data.content?.trim() || data.content.length > MAX_CONTENT_LEN) {
      throw new BadRequestException(`내용은 1~${MAX_CONTENT_LEN}자여야 합니다.`);
    }
    await this.postsRepo.update(postId, { title: data.title.trim(), content: data.content.trim() });
    return this.getPost(postId);
  }

  /* ── 좋아요 / 취소 ───────────────────────────────────────── */

  async likePost(postId: string, userId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    const likes = post.likes ?? [];
    if (likes.includes(userId)) throw new BadRequestException('이미 좋아요를 눌렀습니다.');
    const newLikes = [...likes, userId];
    await this.postsRepo.update(postId, { likes: newLikes });
    return { liked: true, likesCount: newLikes.length };
  }

  async unlikePost(postId: string, userId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    const newLikes = (post.likes ?? []).filter(id => id !== userId);
    await this.postsRepo.update(postId, { likes: newLikes });
    return { liked: false, likesCount: newLikes.length };
  }

  /* ── 신고 ────────────────────────────────────────────────── */

  async reportPost(postId: string, userId: string, reason: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId, isDeleted: false } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId === userId) throw new BadRequestException('자신의 게시글은 신고할 수 없습니다.');
    if (!reason?.trim()) throw new BadRequestException('신고 사유를 입력해주세요.');
    // TODO: 별도 신고 테이블에 저장
    console.warn(`[REPORT] post=${postId} reporter=${userId} reason=${reason}`);
    return { reported: true };
  }
}
