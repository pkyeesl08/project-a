import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or } from 'typeorm';
import { FriendshipEntity, FriendshipStatus } from './friendship.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendshipEntity)
    private friendshipRepo: Repository<FriendshipEntity>,
    private usersService: UsersService,
  ) {}

  /** 친구 요청 */
  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('자기 자신에게 친구 요청을 보낼 수 없습니다.');
    }

    const addressee = await this.usersService.findById(addresseeId);
    if (!addressee) throw new NotFoundException('유저를 찾을 수 없습니다.');

    // 기존 관계 확인 (양방향)
    const existing = await this.findRelation(requesterId, addresseeId);
    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('이미 친구 관계입니다.');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        throw new BadRequestException('이미 친구 요청을 보냈습니다.');
      }
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('차단된 사용자입니다.');
      }
    }

    const fs = this.friendshipRepo.create({
      requesterId,
      addresseeId,
      status: FriendshipStatus.PENDING,
    });
    return this.friendshipRepo.save(fs);
  }

  /** 친구 요청 수락 */
  async acceptRequest(userId: string, requesterId: string) {
    const fs = await this.friendshipRepo.findOne({
      where: { requesterId, addresseeId: userId, status: FriendshipStatus.PENDING },
    });
    if (!fs) throw new NotFoundException('친구 요청을 찾을 수 없습니다.');
    fs.status = FriendshipStatus.ACCEPTED;
    return this.friendshipRepo.save(fs);
  }

  /** 친구 요청 거절 / 친구 삭제 */
  async removeRelation(userId: string, targetId: string) {
    const fs = await this.findRelation(userId, targetId);
    if (!fs) throw new NotFoundException('관계를 찾을 수 없습니다.');
    await this.friendshipRepo.remove(fs);
    return { removed: true };
  }

  /** 차단 */
  async block(blockerId: string, targetId: string) {
    let fs = await this.findRelation(blockerId, targetId);
    if (fs) {
      fs.requesterId = blockerId;
      fs.addresseeId = targetId;
      fs.status = FriendshipStatus.BLOCKED;
      return this.friendshipRepo.save(fs);
    }
    const newFs = this.friendshipRepo.create({
      requesterId: blockerId,
      addresseeId: targetId,
      status: FriendshipStatus.BLOCKED,
    });
    return this.friendshipRepo.save(newFs);
  }

  /** 친구 목록 */
  async getFriends(userId: string) {
    const accepted = await this.friendshipRepo.find({
      where: [
        { requesterId: userId, status: FriendshipStatus.ACCEPTED },
        { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });

    return accepted.map(fs => {
      const friend = fs.requesterId === userId ? fs.addressee : fs.requester;
      return {
        userId: friend.id,
        nickname: friend.nickname,
        profileImage: friend.profileImage,
        eloRating: friend.eloRating,
        since: fs.createdAt,
      };
    });
  }

  /** 받은 대기 중 친구 요청 */
  async getPendingRequests(userId: string) {
    const pending = await this.friendshipRepo.find({
      where: { addresseeId: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'],
      order: { createdAt: 'DESC' },
    });

    return pending.map(fs => ({
      requestId: fs.id,
      from: {
        userId: fs.requester.id,
        nickname: fs.requester.nickname,
        profileImage: fs.requester.profileImage,
        eloRating: fs.requester.eloRating,
      },
      sentAt: fs.createdAt,
    }));
  }

  /** 친구 간 랭킹 비교 */
  async getFriendRankings(userId: string, gameType: string) {
    const friends = await this.getFriends(userId);
    const friendIds = [userId, ...friends.map(f => f.userId)];

    // 실제로는 game_results에서 각 userId별 최고 기록 조회
    // 여기서는 ELO 기반 간략 버전 반환
    return friends
      .sort((a, b) => b.eloRating - a.eloRating)
      .map((f, i) => ({ rank: i + 1, ...f }));
  }

  private async findRelation(userA: string, userB: string): Promise<FriendshipEntity | null> {
    return this.friendshipRepo.findOne({
      where: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    });
  }
}
