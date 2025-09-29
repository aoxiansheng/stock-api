import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

import { QueryRequestDto } from "../dto/query-request.dto";
import { QueryType } from "../dto/query-types.dto";

/**
 * 自定义验证器：根据查询类型验证必需字段
 */
@ValidatorConstraint({ name: "symbolsRequiredForBySymbolsQuery", async: false })
export class SymbolsRequiredForBySymbolsQueryConstraint
  implements ValidatorConstraintInterface
{
  validate(symbols: string[] | undefined, args: ValidationArguments) {
    const object = args.object as QueryRequestDto;

    if (!object) {
      return true;
    }

    // 如果是BY_SYMBOLS查询，symbols必须存在且非空
    if (object.queryType === QueryType.BY_SYMBOLS) {
      return (
        symbols !== undefined && Array.isArray(symbols) && symbols.length > 0
      );
    }

    // 其他查询类型，symbols是可选的
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as QueryRequestDto;
    const symbols = args.value as string[] | undefined;
    
    if (!object) {
      return "";
    }
    
    if (object.queryType === QueryType.BY_SYMBOLS) {
      // 只在验证失败时才返回错误信息
      const isValid = symbols !== undefined && Array.isArray(symbols) && symbols.length > 0;
      if (!isValid) {
        return "symbols字段对于BY_SYMBOLS查询类型是必需的，且不能为空";
      }
    }
    
    return "";
  }
}
