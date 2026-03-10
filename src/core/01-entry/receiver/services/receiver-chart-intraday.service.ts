import { Injectable } from "@nestjs/common";

import { ChartIntradayReadService } from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";
import { IntradayDeltaRequestDto } from "../dto/intraday-delta-request.dto";
import {
  IntradayDeltaResponseDto,
  IntradaySnapshotResponseDto,
} from "../dto/intraday-line-response.dto";
import { IntradaySnapshotRequestDto } from "../dto/intraday-snapshot-request.dto";

@Injectable()
export class ReceiverChartIntradayService {
  constructor(private readonly chartIntradayReadService: ChartIntradayReadService) {}

  getSnapshot(request: IntradaySnapshotRequestDto): Promise<IntradaySnapshotResponseDto> {
    return this.chartIntradayReadService.getSnapshot(request);
  }

  getDelta(request: IntradayDeltaRequestDto): Promise<IntradayDeltaResponseDto> {
    return this.chartIntradayReadService.getDelta(request);
  }
}
