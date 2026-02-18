import {
  IsString, IsNumber, IsOptional, IsBoolean,
  Min, Max, MinLength, MaxLength, Matches, IsObject, IsIn, IsInt,
} from 'class-validator';

/* ── Auth ─────────────────────────────────── */

export class LoginDto {
  @IsString()
  @IsIn(['kakao', 'google', 'apple'], { message: '지원하지 않는 소셜 로그인 제공자입니다.' })
  provider: string;

  @IsString()
  token: string;
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

const VALID_GAME_TYPES = [
  'timing_hit', 'speed_tap', 'lightning_reaction', 'balloon_pop', 'whack_a_mole',
  'memory_flash', 'color_match', 'bigger_number', 'same_picture', 'odd_even',
  'shake_it', 'direction_swipe', 'tilt_balance', 'stop_the_bar', 'rps_speed',
  'line_trace', 'target_sniper', 'dark_room_tap', 'screw_center', 'line_grow',
  'math_speed', 'mic_shout', 'shell_game', 'emoji_sort', 'count_more',
];

export class SubmitResultDto {
  @IsString()
  @IsIn(VALID_GAME_TYPES, { message: '유효하지 않은 게임 타입입니다.' })
  gameType: string;

  @IsInt({ message: '점수는 정수여야 합니다.' })
  @Min(0, { message: '점수는 0 이상이어야 합니다.' })
  @Max(999999, { message: '점수가 허용 범위를 초과했습니다.' })
  score: number;

  @IsString()
  @IsIn(['solo', 'pvp', 'team'], { message: '모드는 solo, pvp, team 중 하나여야 합니다.' })
  mode: string;

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
