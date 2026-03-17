import { Injectable } from "@nestjs/common";

import { ChartIntradayReadService } from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";
import {
  IntradayDeltaResponseDto,
  IntradayReleaseResponseDto,
  IntradaySnapshotResponseDto,
} from "../dto/intraday-line-response.dto";

type ReceiverIntradaySnapshotRequest = Parameters<
  ChartIntradayReadService["getSnapshot"]
>[0];
type ReceiverIntradayDeltaRequest = Parameters<
  ChartIntradayReadService["getDelta"]
>[0];
type ReceiverIntradayReleaseRequest = Parameters<
  ChartIntradayReadService["releaseRealtimeSubscription"]
>[0];

@Injectable()
export class ReceiverChartIntradayService {
  constructor(
    private readonly chartIntradayReadService: ChartIntradayReadService,
  ) {}

  getSnapshot(
    request: ReceiverIntradaySnapshotRequest,
  ): Promise<IntradaySnapshotResponseDto> {
    return this.chartIntradayReadService.getSnapshot(request);
  }

  getDelta(
    request: ReceiverIntradayDeltaRequest,
  ): Promise<IntradayDeltaResponseDto> {
    return this.chartIntradayReadService.getDelta(request);
  }

  releaseRealtimeSubscription(
    request: ReceiverIntradayReleaseRequest,
  ): Promise<IntradayReleaseResponseDto> {
    return this.chartIntradayReadService.releaseRealtimeSubscription(request);
  }
}
