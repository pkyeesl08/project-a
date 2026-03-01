import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAccountEntity } from './external-account.entity';
import { ExternalService } from './external.service';
import { ExternalController } from './external.controller';
import { RiotApiService } from './riot-api.service';
import { NexonApiService } from './nexon-api.service';
import { PubgApiService } from './pubg-api.service';
import { SteamApiService } from './steam-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalAccountEntity])],
  controllers: [ExternalController],
  providers: [ExternalService, RiotApiService, NexonApiService, PubgApiService, SteamApiService],
  exports: [ExternalService, RiotApiService, NexonApiService, PubgApiService, SteamApiService],
})
export class ExternalModule {}
