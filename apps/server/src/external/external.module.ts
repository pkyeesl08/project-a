import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAccountEntity } from './external-account.entity';
import { ExternalService } from './external.service';
import { ExternalController } from './external.controller';
import { RiotApiService } from './riot-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalAccountEntity])],
  controllers: [ExternalController],
  providers: [ExternalService, RiotApiService],
  exports: [ExternalService, RiotApiService],
})
export class ExternalModule {}
