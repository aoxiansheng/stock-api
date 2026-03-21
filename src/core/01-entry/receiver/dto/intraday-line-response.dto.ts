import { ApiProperty } from "@nestjs/swagger";
import type {
  IntradayDeltaPayloadDto as IntradayDeltaPayloadDtoContract,
  IntradayDeltaResponseDto as IntradayDeltaResponseDtoContract,
  IntradayLineDto as IntradayLineDtoContract,
  IntradayPointDto as IntradayPointDtoContract,
  IntradayReleasePayloadDto as IntradayReleasePayloadDtoContract,
  IntradayReleaseResponseDto as IntradayReleaseResponseDtoContract,
  IntradaySnapshotCapabilityDto as IntradaySnapshotCapabilityDtoContract,
  IntradaySnapshotMetadataDto as IntradaySnapshotMetadataDtoContract,
  IntradaySnapshotReferenceDto as IntradaySnapshotReferenceDtoContract,
  IntradaySnapshotResponseDto as IntradaySnapshotResponseDtoContract,
  IntradaySyncDto as IntradaySyncDtoContract,
  IntradaySyncRealtimeDto as IntradaySyncRealtimeDtoContract,
} from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";

export class IntradayPointDto implements IntradayPointDtoContract {
  @ApiProperty({
    description: "点位时间（UTC ISO）",
    example: "2026-03-08T15:42:01.000Z",
  })
  timestamp: string;

  @ApiProperty({
    description: "价格",
    example: 195.92,
  })
  price: number;

  @ApiProperty({
    description: "成交量",
    example: 540,
  })
  volume: number;
}

export class IntradayLineDto implements IntradayLineDtoContract {
  @ApiProperty({ example: "AAPL.US" })
  symbol: string;

  @ApiProperty({ example: "US" })
  market: string;

  @ApiProperty({ example: "20260308" })
  tradingDay: string;

  @ApiProperty({ example: "1s" })
  granularity: "1s";

  @ApiProperty({ type: [IntradayPointDto] })
  points: IntradayPointDto[];
}

export class IntradaySnapshotCapabilityDto
  implements IntradaySnapshotCapabilityDtoContract
{
  @ApiProperty({ example: "1m" })
  snapshotBaseGranularity: "1m";

  @ApiProperty({ example: false })
  supportsFullDay1sHistory: boolean;
}

export class IntradaySyncRealtimeDto implements IntradaySyncRealtimeDtoContract {
  @ApiProperty({ example: "stream-stock-quote" })
  wsCapabilityType: string;

  @ApiProperty({ example: "chart.intraday.point" })
  event: string;

  @ApiProperty({ example: "infoway" })
  preferredProvider: string;
}

export class IntradaySyncDto implements IntradaySyncDtoContract {
  @ApiProperty({
    example:
      "eyJ2IjoxLCJzeW1ib2wiOiJBQVBMLlVTIiwibWFya2V0IjoiVVMiLCJ0cmFkaW5nRGF5IjoiMjAyNjAzMDgiLCJsYXN0UG9pbnRUaW1lc3RhbXAiOiIyMDI2LTAzLTA4VDE1OjQyOjAwLjAwMFoiLCJpc3N1ZWRBdCI6IjIwMjYtMDMtMDhUMTU6NDI6MDEuMTIwWiJ9",
  })
  cursor: string;

  @ApiProperty({ example: "2026-03-08T15:42:00.000Z" })
  lastPointTimestamp: string;

  @ApiProperty({ example: "2026-03-08T15:42:01.120Z" })
  serverTime: string;

  @ApiProperty({ type: IntradaySyncRealtimeDto, nullable: true })
  realtime: IntradaySyncRealtimeDto | null;
}

export class IntradaySnapshotMetadataDto
  implements IntradaySnapshotMetadataDtoContract
{
  @ApiProperty({ example: "infoway" })
  provider: string;

  @ApiProperty({ example: 240 })
  historyPoints: number;

  @ApiProperty({ example: 12 })
  realtimeMergedPoints: number;

  @ApiProperty({ example: 8 })
  deduplicatedPoints: number;

  @ApiProperty({
    example: "live",
    enum: ["live", "paused", "frozen"],
  })
  runtimeMode: "live" | "paused" | "frozen";

  @ApiProperty({ example: "20260317" })
  effectiveTradingDay: string;

  @ApiProperty({ example: false })
  frozenSnapshotHit: boolean;

  @ApiProperty({ example: false })
  frozenSnapshotFallback: boolean;
}

export class IntradaySnapshotReferenceDto
  implements IntradaySnapshotReferenceDtoContract
{
  @ApiProperty({ example: 255.76, nullable: true })
  previousClosePrice: number | null;

  @ApiProperty({ example: 255.48, nullable: true })
  sessionOpenPrice: number | null;

  @ApiProperty({ example: "previous_close" })
  priceBase: "previous_close";

  @ApiProperty({ example: "regular" })
  marketSession: "regular" | "utc_day";

  @ApiProperty({ example: "America/New_York" })
  timezone: string;

  @ApiProperty({ example: "complete" })
  status: "complete" | "partial" | "unavailable";
}

export class IntradaySnapshotResponseDto
  implements IntradaySnapshotResponseDtoContract
{
  @ApiProperty({ type: IntradayLineDto })
  line: IntradayLineDto;

  @ApiProperty({ type: IntradaySnapshotCapabilityDto })
  capability: IntradaySnapshotCapabilityDto;

  @ApiProperty({ type: IntradaySnapshotReferenceDto })
  reference: IntradaySnapshotReferenceDto;

  @ApiProperty({ type: IntradaySyncDto })
  sync: IntradaySyncDto;

  @ApiProperty({ type: IntradaySnapshotMetadataDto })
  metadata: IntradaySnapshotMetadataDto;
}

export class IntradayDeltaPayloadDto
  implements IntradayDeltaPayloadDtoContract
{
  @ApiProperty({ type: [IntradayPointDto] })
  points: IntradayPointDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;

  @ApiProperty({
    example:
      "eyJ2IjoxLCJzeW1ib2wiOiJBQVBMLlVTIiwibWFya2V0IjoiVVMiLCJ0cmFkaW5nRGF5IjoiMjAyNjAzMDgiLCJsYXN0UG9pbnRUaW1lc3RhbXAiOiIyMDI2LTAzLTA4VDE1OjQyOjAxLjAwMFoiLCJpc3N1ZWRBdCI6IjIwMjYtMDMtMDhUMTU6NDI6MDEuMjIwWiJ9",
  })
  nextCursor: string;

  @ApiProperty({ example: "2026-03-08T15:42:01.000Z" })
  lastPointTimestamp: string;

  @ApiProperty({ example: "2026-03-08T15:42:01.220Z" })
  serverTime: string;
}

export class IntradayDeltaResponseDto
  implements IntradayDeltaResponseDtoContract
{
  @ApiProperty({ type: IntradayDeltaPayloadDto })
  delta: IntradayDeltaPayloadDto;
}

export class IntradayReleasePayloadDto
  implements IntradayReleasePayloadDtoContract
{
  @ApiProperty({ example: true })
  leaseReleased: boolean;

  @ApiProperty({ example: false })
  upstreamReleased: boolean;

  @ApiProperty({
    example: "RELEASED",
    enum: ["RELEASED", "ALREADY_RELEASED"],
  })
  reason: "RELEASED" | "ALREADY_RELEASED";

  @ApiProperty({ example: "AAPL.US" })
  symbol: string;

  @ApiProperty({ example: "US" })
  market: string;

  @ApiProperty({ example: "infoway" })
  provider: string;

  @ApiProperty({ example: "stream-stock-quote" })
  wsCapabilityType: string;

  @ApiProperty({ example: 1 })
  activeLeaseCount: number;

  @ApiProperty({
    example: "2026-03-16T15:30:00.000Z",
    nullable: true,
  })
  graceExpiresAt: string | null;
}

export class IntradayReleaseResponseDto
  implements IntradayReleaseResponseDtoContract
{
  @ApiProperty({ type: IntradayReleasePayloadDto })
  release: IntradayReleasePayloadDto;
}

/**
 * chart.intraday.point WS 事件的公开契约。
 * 实际发射逻辑在 StreamClientStateManager.flushIntradayBucketEmission() 中。
 */
export interface IntradayPointEventDto {
  symbol: string;
  market: string;
  tradingDay: string;
  granularity: "1s";
  point: {
    timestamp: string;
    price: number;
    volume: number;
  };
  cursor: string;
}
