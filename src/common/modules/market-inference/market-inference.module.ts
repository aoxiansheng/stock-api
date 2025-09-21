import { Module } from '@nestjs/common';

import { MarketInferenceService } from './services/market-inference.service';

@Module({
  providers: [MarketInferenceService],
  exports: [MarketInferenceService],
})
export class MarketInferenceModule {}
