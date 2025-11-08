import { Injectable, OnModuleInit } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { SymbolMapperService } from "@core/00-prepare/symbol-mapper/services/symbol-mapper.service";
import { AddSymbolMappingRuleDto, UpdateSymbolMappingRuleDto } from "@core/00-prepare/symbol-mapper/dto/update-symbol-mapping.dto";
import { CreateSymbolMappingDto } from "@core/00-prepare/symbol-mapper/dto/create-symbol-mapping.dto";
import { REFERENCE_DATA } from "@common/constants/domain";

/**
 * 预设 Symbol 规则启动初始化器
 * - 在模块初始化时将预设的 symbol 映射规则写入数据库（仅 longport 数据源）
 * - 幂等：不存在则创建，存在则逐条更新/追加
 * - 仅持久化规则，不改变运行时转换路径
 */
@Injectable()
export class PresetSymbolRulesInitializer implements OnModuleInit {
  private readonly logger = createLogger(PresetSymbolRulesInitializer.name);

  constructor(private readonly symbolMapperService: SymbolMapperService) {}

  async onModuleInit(): Promise<void> {
    const provider = REFERENCE_DATA.PROVIDER_IDS.LONGPORT; // longport

    // 预设规则（覆盖测试常用符号，HK前导0→厂商格式）
    const rules = [
      // US
      { standardSymbol: "AAPL.US", sdkSymbol: "AAPL.US", market: "US", symbolType: "stock" },
      { standardSymbol: "TSLA.US", sdkSymbol: "TSLA.US", market: "US", symbolType: "stock" },
      { standardSymbol: "GOOGL.US", sdkSymbol: "GOOGL.US", market: "US", symbolType: "stock" },
      { standardSymbol: "MSFT.US", sdkSymbol: "MSFT.US", market: "US", symbolType: "stock" },
      { standardSymbol: "AMZN.US", sdkSymbol: "AMZN.US", market: "US", symbolType: "stock" },

      // HK（移除前导0以适配常见厂商编码）
      { standardSymbol: "00700.HK", sdkSymbol: "700.HK", market: "HK", symbolType: "stock" },
      { standardSymbol: "09988.HK", sdkSymbol: "9988.HK", market: "HK", symbolType: "stock" },
      { standardSymbol: "01810.HK", sdkSymbol: "1810.HK", market: "HK", symbolType: "stock" },
      { standardSymbol: "02318.HK", sdkSymbol: "2318.HK", market: "HK", symbolType: "stock" },

      // CN（保持不变）
      { standardSymbol: "600519.SH", sdkSymbol: "600519.SH", market: "SH", symbolType: "stock" },
      { standardSymbol: "000001.SZ", sdkSymbol: "000001.SZ", market: "SZ", symbolType: "stock" },
      { standardSymbol: "600036.SH", sdkSymbol: "600036.SH", market: "SH", symbolType: "stock" },
    ];

    try {
      // 尝试读取现有数据源映射
      let exists = true;
      try {
        await this.symbolMapperService.getSymbolMappingByDataSource(provider);
      } catch {
        exists = false;
      }

      if (!exists) {
        const createDto: CreateSymbolMappingDto = {
          dataSourceName: provider,
          SymbolMappingRule: rules.map((r) => ({
            standardSymbol: r.standardSymbol,
            sdkSymbol: r.sdkSymbol,
            market: r.market,
            symbolType: r.symbolType,
            isActive: true,
            description: "preset",
          })),
          description: "preset symbol mappings",
          version: "1.0.0",
          isActive: true,
          createdBy: "system",
        } as any;

        await this.symbolMapperService.createDataSourceMapping(createDto);
        this.logger.log("已创建预设符号映射数据源", { provider, rules: rules.length });
        return;
      }

      // 已存在：逐条更新/追加（优先更新，缺失则追加）
      let updated = 0;
      let added = 0;
      for (const r of rules) {
        const updateDto: UpdateSymbolMappingRuleDto = {
          dataSourceName: provider,
          standardSymbol: r.standardSymbol,
          symbolMappingRule: {
            sdkSymbol: r.sdkSymbol,
            market: r.market,
            symbolType: r.symbolType,
            isActive: true,
            description: "preset",
          } as any,
        };

        try {
          await this.symbolMapperService.updateSymbolMappingRule(updateDto);
          updated++;
        } catch {
          const addDto: AddSymbolMappingRuleDto = {
            dataSourceName: provider,
            symbolMappingRule: {
              standardSymbol: r.standardSymbol,
              sdkSymbol: r.sdkSymbol,
              market: r.market,
              symbolType: r.symbolType,
              isActive: true,
              description: "preset",
            } as any,
          };
          try {
            await this.symbolMapperService.addSymbolMappingRule(addDto);
            added++;
          } catch (err) {
            this.logger.warn("预设符号规则写入失败(跳过)", {
              standardSymbol: r.standardSymbol,
              error: (err as any)?.message,
            });
          }
        }
      }
      this.logger.log("预设符号规则同步完成", { provider, updated, added });
    } catch (error: any) {
      this.logger.warn("预设符号规则持久化失败(启动阶段)，将继续启动流程", {
        error: error?.message,
      });
    }
  }
}
