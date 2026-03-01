import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MatchGateway } from './match.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    UsersModule,
  ],
  providers: [MatchGateway],
})
export class MatchModule {}
