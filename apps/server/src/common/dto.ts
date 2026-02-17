import {
  IsString, IsNumber, IsOptional, IsBoolean,
  Min, Max, IsObject,
} from 'class-validator';

/* ── Auth ─────────────────────────────────── */

export class LoginDto {
  @IsString() provider: string;
  @IsString() token: string;
}

export class RefreshDto {
  @IsString() refreshToken: string;
}

/* ── User ─────────────────────────────────── */

export class UpdateProfileDto {
  @IsOptional() @IsString()  nickname?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString()  profileImage?: string;
}

/* ── Region ───────────────────────────────── */

export class VerifyRegionDto {
  @IsNumber() @Min(-90)  @Max(90)  latitude: number;
  @IsNumber() @Min(-180) @Max(180) longitude: number;
}

/* ── School ───────────────────────────────── */

export class VerifySchoolDto {
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() schoolId?: string;
}

/* ── Game ─────────────────────────────────── */

export class SubmitResultDto {
  @IsString()            gameType: string;
  @IsNumber()            score: number;
  @IsString()            mode: string;
  @IsOptional() @IsString()  opponentId?: string;
  @IsOptional() @IsString()  matchId?: string;
  @IsOptional() @IsObject()  metadata?: Record<string, unknown>;
}

/* ── External ─────────────────────────────── */

export class ConnectExternalDto {
  @IsString() token: string;
  @IsString() game: string;
}

export class SyncExternalDto {
  @IsString() game: string;
}
