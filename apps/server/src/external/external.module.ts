import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAccountEntity } from './external-account.entity';
import { ExternalService } from './external.service';
import { ExternalController } from './external.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalAccountEntity])],
  controllers: [ExternalController],
  providers: [ExternalService],
  exports: [ExternalService],
})
export class ExternalModule {}
