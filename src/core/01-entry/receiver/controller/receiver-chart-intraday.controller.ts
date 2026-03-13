import {
  Body,
  Controller,
  HttpCode,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ReadAccess } from "@authv2/decorators";
import {
  ApiKeyAuthResponses,
  ApiSuccessResponse,
} from "@common/core/decorators/swagger-responses.decorator";

import { IntradayDeltaRequestDto } from "../dto/intraday-delta-request.dto";
import { IntradayReleaseRequestDto } from "../dto/intraday-release-request.dto";
import {
  IntradayDeltaResponseDto,
  IntradayReleaseResponseDto,
  IntradaySnapshotResponseDto,
} from "../dto/intraday-line-response.dto";
import { IntradaySnapshotRequestDto } from "../dto/intraday-snapshot-request.dto";
import { ReceiverChartIntradayService } from "../services/receiver-chart-intraday.service";

@ApiTags("📈 分时折线接口")
@Controller("chart/intraday-line")
export class ReceiverChartIntradayController {
  constructor(
    private readonly receiverChartIntradayService: ReceiverChartIntradayService,
  ) {}

  @ReadAccess()
  @Post("snapshot")
  @HttpCode(200)
  @ApiConsumes("application/json")
  @ApiOperation({
    summary: "分时折线快照（首屏全量）",
    description:
      "返回当前可得分时快照。当前实现为 1m 历史基线 + 实时 1s 增量窗口。",
  })
  @ApiSuccessResponse({ type: IntradaySnapshotResponseDto })
  @ApiKeyAuthResponses()
  getSnapshot(@Body(ValidationPipe) body: IntradaySnapshotRequestDto) {
    return this.receiverChartIntradayService.getSnapshot(body);
  }

  @ReadAccess()
  @Post("delta")
  @HttpCode(200)
  @ApiConsumes("application/json")
  @ApiOperation({
    summary: "分时折线增量（仅增量）",
    description: "基于 cursor 返回增量点位。delta 请求必须提供有效 cursor。",
  })
  @ApiSuccessResponse({ type: IntradayDeltaResponseDto })
  @ApiKeyAuthResponses()
  getDelta(@Body(ValidationPipe) body: IntradayDeltaRequestDto) {
    return this.receiverChartIntradayService.getDelta(body);
  }

  @ReadAccess()
  @Post("release")
  @HttpCode(200)
  @ApiConsumes("application/json")
  @ApiOperation({
    summary: "释放分时图内部实时订阅",
    description:
      "显式释放由分时图接口自动拉起的内部实时订阅，适用于页面卸载或切换 symbol。",
  })
  @ApiSuccessResponse({ type: IntradayReleaseResponseDto })
  @ApiKeyAuthResponses()
  releaseRealtimeSubscription(
    @Body(ValidationPipe) body: IntradayReleaseRequestDto,
  ) {
    return this.receiverChartIntradayService.releaseRealtimeSubscription(body);
  }
}
