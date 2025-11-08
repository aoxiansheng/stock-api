import { SymbolTransformResult } from "./symbol-transform-result.interface";
import { MappingDirection } from "@core/shared/constants";

/**
 * 符号转换器接口
 * 仅保留当前实现实际遵循的契约
 */
export interface ISymbolTransformer {
  transformSymbols(
    provider: string,
    symbols: string | string[],
    direction?: MappingDirection,
  ): Promise<SymbolTransformResult>;

  transformSingleSymbol(
    provider: string,
    symbol: string,
    direction?: MappingDirection,
  ): Promise<string>;
}
