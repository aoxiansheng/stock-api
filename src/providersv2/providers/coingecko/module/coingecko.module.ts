import { Module } from "@nestjs/common";

import { CoinGeckoProvider } from "../coingecko.provider";
import { CoinGeckoContextService } from "../services/coingecko-context.service";

@Module({
  providers: [CoinGeckoProvider, CoinGeckoContextService],
  exports: [CoinGeckoProvider, CoinGeckoContextService],
})
export class CoinGeckoModule {}
