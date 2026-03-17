import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  ValidationPipe,
} from "@nestjs/common";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request as ExpressRequest } from "express";

import { ReadAccess } from "@authv2/decorators";
import { buildChartIntradayOwnerIdentity } from "@core/03-fetching/chart-intraday/services/chart-intraday-session.service";
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

  private buildSnapshotRequest(
    body: IntradaySnapshotRequestDto,
    req: ExpressRequest & { user?: any },
  ): Parameters<ReceiverChartIntradayService["getSnapshot"]>[0] {
    return {
      ...body,
      ownerIdentity: buildChartIntradayOwnerIdentity(req?.user),
    };
  }

  private buildDeltaRequest(
    body: IntradayDeltaRequestDto,
    req: ExpressRequest & { user?: any },
  ): Parameters<ReceiverChartIntradayService["getDelta"]>[0] {
    return {
      ...body,
      ownerIdentity: buildChartIntradayOwnerIdentity(req?.user),
    };
  }

  private buildReleaseRequest(
    body: IntradayReleaseRequestDto,
    req: ExpressRequest & { user?: any },
  ): Parameters<ReceiverChartIntradayService["releaseRealtimeSubscription"]>[0] {
    return {
      ...body,
      ownerIdentity: buildChartIntradayOwnerIdentity(req?.user),
    };
  }

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
  getSnapshot(
    @Body(ValidationPipe) body: IntradaySnapshotRequestDto,
    @Req() req: ExpressRequest & { user?: any },
  ) {
    return this.receiverChartIntradayService.getSnapshot(
      this.buildSnapshotRequest(body, req),
    );
  }

  @ReadAccess()
  @Post("delta")
  @HttpCode(200)
  @ApiConsumes("application/json")
  @ApiOperation({
    summary: "分时折线增量（仅增量）",
    description:
      "基于 cursor 返回增量点位。delta 请求必须同时提供有效 cursor 与 snapshot 返回的 sessionId。",
  })
  @ApiSuccessResponse({ type: IntradayDeltaResponseDto })
  @ApiKeyAuthResponses()
  getDelta(
    @Body(ValidationPipe) body: IntradayDeltaRequestDto,
    @Req() req: ExpressRequest & { user?: any },
  ) {
    return this.receiverChartIntradayService.getDelta(
      this.buildDeltaRequest(body, req),
    );
  }

  @ReadAccess()
  @Post("release")
  @HttpCode(200)
  @ApiConsumes("application/json")
  @ApiOperation({
    summary: "释放分时图内部实时订阅",
    description:
      "显式释放由分时图接口自动拉起的内部实时订阅。release 请求必须提供 snapshot 返回的 sessionId，重复释放按幂等成功返回。",
  })
  @ApiSuccessResponse({ type: IntradayReleaseResponseDto })
  @ApiKeyAuthResponses()
  releaseRealtimeSubscription(
    @Body(ValidationPipe) body: IntradayReleaseRequestDto,
    @Req() req: ExpressRequest & { user?: any },
  ) {
    return this.receiverChartIntradayService.releaseRealtimeSubscription(
      this.buildReleaseRequest(body, req),
    );
  }
}
