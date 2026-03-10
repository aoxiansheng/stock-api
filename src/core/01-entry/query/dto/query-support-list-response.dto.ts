import { ApiProperty } from "@nestjs/swagger";

export class SupportListMetaResponseDto {
  @ApiProperty({ example: "STOCK_US" })
  type: string;

  @ApiProperty({ example: "20260309020000" })
  currentVersion: string;

  @ApiProperty({ example: "2026-03-09T02:00:00.000Z" })
  lastUpdated: string;

  @ApiProperty({ example: 7 })
  retentionDays: number;
}

export class SupportListFullResponseDto {
  @ApiProperty({ example: true })
  full: true;

  @ApiProperty({ example: "20260309020000" })
  version: string;

  @ApiProperty({ type: [Object] })
  items: Record<string, unknown>[];
}

export class SupportListDeltaResponseDto {
  @ApiProperty({ example: false })
  full: false;

  @ApiProperty({ example: "20260301020000" })
  from: string;

  @ApiProperty({ example: "20260309020000" })
  to: string;

  @ApiProperty({ type: [Object] })
  added: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  updated: Record<string, unknown>[];

  @ApiProperty({ type: [String] })
  removed: string[];
}

export class SupportListResyncRequiredResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({
    example: "since 对应版本链不可用，请先执行不带 since 的全量同步后重试",
  })
  message: string;

  @ApiProperty({ example: "SUPPORT_LIST_RESYNC_REQUIRED" })
  errorCode: string;

  @ApiProperty({ example: "BusinessException" })
  error: string;

  @ApiProperty({ example: "2026-03-10T08:00:00.000Z" })
  timestamp: string;
}
