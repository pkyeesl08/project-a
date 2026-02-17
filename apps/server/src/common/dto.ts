import {
  IsString, IsNumber, IsOptional, IsBoolean,
  Min, Max, MinLength, MaxLength, Matches, IsObject,
} from 'class-validator';

/* ── Auth ─────────────────────────────────── */

export class LoginDto {
  @IsString() provider: string;
  @IsString() token: string;
}

export class RefreshDto {
  @IsString() refreshToken: string;
}

export class RegisterDto {
  @IsString() registerToken: string;

  @IsString()
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다.' })
  @MaxLength(12, { message: '닉네임은 12자 이하여야 합니다.' })
  @Matches(/^[가-힣a-zA-Z0-9_]+$/, { message: '닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.' })
  nickname: string;
}

/* ── User ─────────────────────────────────── */

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다.' })
  @MaxLength(12, { message: '닉네임은 12자 이하여야 합니다.' })
  @Matches(/^[가-힣a-zA-Z0-9_]+$/, { message: '닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.' })
  nickname?: string;

  @IsOptional() @IsBoolean() isPublic?: boolean;
  @IsOptional() @IsString()  profileImage?: string;
}

export class CheckNicknameDto {
  @IsString()
  @MinLength(2, { message: '닉네임은 2자 이상이어야 합니다.' })
  @MaxLength(12, { message: '닉네임은 12자 이하여야 합니다.' })
  @Matches(/^[가-힣a-zA-Z0-9_]+$/, { message: '닉네임은 한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.' })
  nickname: string;
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
