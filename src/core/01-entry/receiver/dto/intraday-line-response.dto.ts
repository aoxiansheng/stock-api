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

export class IntradaySyncDto implements IntradaySyncDtoContract {
  @ApiProperty({
    example:
      "eyJ2IjoxLCJzeW1ib2wiOiJBQVBMLlVTIiwibWFya2V0IjoiVVMiLCJ0cmFkaW5nRGF5IjoiMjAyNjAzMDgiLCJsYXN0UG9pbnRUaW1lc3RhbXAiOiIyMDI2LTAzLTA4VDE1OjQyOjAwLjAwMFoiLCJpc3N1ZWRBdCI6IjIwMjYtMDMtMDhUMTU6NDI6MDEuMTIwWiJ9",
  })
  cursor: string;

  @ApiProperty({
    example: "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a",
  })
  sessionId: string;

  @ApiProperty({ example: "2026-03-08T15:42:00.000Z" })
  lastPointTimestamp: string;

  @ApiProperty({ example: "2026-03-08T15:42:01.120Z" })
  serverTime: string;
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
  sessionReleased: boolean;

  @ApiProperty({ example: false })
  upstreamReleased: boolean;

  @ApiProperty({ example: "AAPL.US" })
  symbol: string;

  @ApiProperty({ example: "US" })
  market: string;

  @ApiProperty({ example: "infoway" })
  provider: string;

  @ApiProperty({ example: "stream-stock-quote" })
  wsCapabilityType: string;

  @ApiProperty({ example: 1 })
  activeSessionCount: number;

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
