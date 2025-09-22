# Analysis Report

## Unused Classes
- `core/shared/constants/limits.ts:247` `CoreLimitsUtil` — no references across the workspace; only exported via the constants index.
- `core/shared/constants/market.constants.ts:477` `MarketDomainUtil` — not imported anywhere; includes internal usage of `MARKET_CACHE_CONFIG` and `MARKET_BATCH_CONFIG` within its methods, but the entire class remains unused externally.
- `core/shared/types/storage-classification.enum.ts:59` `StorageClassificationUtils` — unused utility wrapper around the `StorageClassification` enum.

## Unused Fields / Functions / Types
- `core/shared/constants/cache.constants.ts:25` `SHARED_CACHE_CONSTANTS.CLEANUP_THRESHOLD` — never read.
- `core/shared/constants/cache.constants.ts:28` `SharedCacheConstants` type alias — unused.
- `core/shared/constants/market.constants.ts:47` `MARKET_DOMAIN_CONFIG` — defined and re-exported but not consumed.
- `core/shared/constants/market.constants.ts:400` `MARKET_DATA_QUALITY` — never referenced.
- `core/shared/constants/market.constants.ts:579-581` `MarketDomainConfig` / `MarketCacheConfig` / `MarketApiTimeouts` type aliases — unused.
- `core/shared/constants/limits.ts:417` `CoreLimits` type alias — unused.
- `core/shared/services/field-mapping.service.ts:136` `FieldMappingService.batchCapabilityToClassification` — not called.
- `core/shared/services/field-mapping.service.ts:147` `FieldMappingService.batchClassificationToCapability` — not called.
- `core/shared/services/field-mapping.service.ts:159` `FieldMappingService.validateMappingConfig` — never invoked.
- `core/shared/utils/string.util.ts:28` `StringUtils.calculateSimilarity` — unused helper.
- `core/shared/utils/string.util.ts:85` `StringUtils.levenshteinDistance` — only referenced by the unused method above.

## Unused Interfaces
- 未发现。

## Duplicate Type / Logic Files
- `core/shared/utils/string.util.ts:85` `StringUtils.levenshteinDistance` duplicates the implementation in `core/00-prepare/data-mapper/services/rule-alignment.service.ts:776`, causing parallel maintenance of the same algorithm.

## Deprecated Elements
- 未发现 `@deprecated` 标记的字段、函数或文件。

## Backward Compatibility & Transitional Layers
- `core/shared/types/storage-classification.enum.ts:1` consolidates duplicate enum definitions so downstream modules can keep legacy values without refactoring.
- `core/shared/services/field-mapping.service.ts:25` bridges legacy `ReceiverType` identifiers to the unified `StorageClassification`, preserving historical request payloads.
- `core/shared/services/data-change-detector.service.ts:97` keeps an in-memory snapshot fallback so the detector degrades gracefully when Redis is unavailable.
- `core/shared/services/market-status.service.ts:85` prioritises provider data but falls back to cached/local calculations, matching legacy behaviour when external integrations fail.
- `core/shared/module/shared-services.module.ts:31` remains `@Global` to preserve historical cross-module injections of shared business services.
- `core/shared/constants/index.ts:18` re-exports the legacy aggregate entry point so existing import paths keep working after the constants split.

## Notes
- 本次分析未修改业务代码，也未运行测试。

## 分析准确性复核 (2025-09-22)
- **整体准确率**: ~90%
- **已修正**: 移除了对 `MARKET_CACHE_CONFIG` 和 `MARKET_BATCH_CONFIG` 的错误"未使用"标记
- **关键发现**: `MarketDomainUtil` 类虽然外部未被使用，但其内部方法确实使用了相关常量配置
- **验证方法**: 通过代码搜索和文件内容检查确认常量的实际使用情况
- **建议**: 未来分析应检查同文件内的内部使用关系，避免误标记为"未使用"
