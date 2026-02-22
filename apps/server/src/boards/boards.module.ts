import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardPostEntity } from './board-post.entity';
import { BoardCommentEntity } from './board-comment.entity';
import { BoardReportEntity } from './board-report.entity';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BoardPostEntity, BoardCommentEntity, BoardReportEntity])],
  controllers: [BoardsController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
