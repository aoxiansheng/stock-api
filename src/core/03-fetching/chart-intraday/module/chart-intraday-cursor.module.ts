import { Module } from "@nestjs/common";

import { ChartIntradayCursorService } from "../services/chart-intraday-cursor.service";

@Module({
  providers: [ChartIntradayCursorService],
  exports: [ChartIntradayCursorService],
})
export class ChartIntradayCursorModule {}
