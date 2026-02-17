import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolEntity } from './school.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(SchoolEntity)
    private schoolsRepo: Repository<SchoolEntity>,
    private usersService: UsersService,
  ) {}

  async verifyByEmail(userId: string, email: string) {
    const domain = email.split('@')[1];
    if (!domain) throw new BadRequestException('유효하지 않은 이메일입니다.');

    const school = await this.schoolsRepo.findOne({ where: { verifiedDomain: domain } });
    if (!school) throw new BadRequestException('등록된 학교 도메인이 아닙니다.');

    // TODO: 이메일 인증 코드 발송 로직
    await this.usersService.updateProfile(userId, { schoolId: school.id });

    return { schoolId: school.id, schoolName: school.name, schoolType: school.type, verified: true };
  }

  async verifyBySchoolId(userId: string, schoolId: string) {
    const school = await this.schoolsRepo.findOne({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('학교를 찾을 수 없습니다.');

    await this.usersService.updateProfile(userId, { schoolId: school.id });
    return { schoolId: school.id, schoolName: school.name, schoolType: school.type, verified: true };
  }

  async search(query: string) {
    return this.schoolsRepo
      .createQueryBuilder('school')
      .where('school.name ILIKE :query', { query: `%${query}%` })
      .limit(20)
      .getMany();
  }

  async findById(id: string) {
    return this.schoolsRepo.findOne({ where: { id } });
  }
}
