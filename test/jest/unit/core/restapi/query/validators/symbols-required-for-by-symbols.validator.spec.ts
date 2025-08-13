/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * SymbolsRequiredForBySymbolsQueryConstraint 单元测试
 * 测试根据查询类型验证必需字段的验证器
 */

import { ValidationArguments } from "class-validator";

import { SymbolsRequiredForBySymbolsQueryConstraint } from "../../../../../../../src/core/restapi/query/validators/symbols-required-for-by-symbols.validator";
import { QueryRequestDto } from "../../../../../../../src/core/restapi/query/dto/query-request.dto";
import { QueryType } from "../../../../../../../src/core/restapi/query/dto/query-types.dto";

describe("SymbolsRequiredForBySymbolsQueryConstraint", () => {
  let validator: SymbolsRequiredForBySymbolsQueryConstraint;

  beforeEach(() => {
    validator = new SymbolsRequiredForBySymbolsQueryConstraint();
  });

  describe("validate", () => {
    describe("当查询类型为BY_SYMBOLS时", () => {
      it("应该要求symbols字段存在且非空", () => {
        // Arrange
        const mockArgs: ValidationArguments = {
          object: { queryType: QueryType.BY_SYMBOLS } as QueryRequestDto,
          property: "symbols",
          value: ["AAPL", "700.HK"],
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act
        const result = validator.validate(["AAPL", "700.HK"], mockArgs);

        // Assert
        expect(result).toBe(true);
      });

      it("应该拒绝空的symbols数组", () => {
        // Arrange
        const mockArgs: ValidationArguments = {
          object: { queryType: QueryType.BY_SYMBOLS } as QueryRequestDto,
          property: "symbols",
          value: [],
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act
        const result = validator.validate([], mockArgs);

        // Assert
        expect(result).toBe(false);
      });

      it("应该拒绝undefined的symbols", () => {
        // Arrange
        const mockArgs: ValidationArguments = {
          object: { queryType: QueryType.BY_SYMBOLS } as QueryRequestDto,
          property: "symbols",
          value: undefined,
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act
        const result = validator.validate(undefined, mockArgs);

        // Assert
        expect(result).toBe(false);
      });

      it("应该拒绝null的symbols", () => {
        // Arrange
        const mockArgs: ValidationArguments = {
          object: { queryType: QueryType.BY_SYMBOLS } as QueryRequestDto,
          property: "symbols",
          value: null,
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act
        const result = validator.validate(null as any, mockArgs);

        // Assert
        expect(result).toBe(false);
      });

      it("应该拒绝非数组的symbols", () => {
        // Arrange
        const mockArgs: ValidationArguments = {
          object: { queryType: QueryType.BY_SYMBOLS } as QueryRequestDto,
          property: "symbols",
          value: "not-an-array",
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act
        const result = validator.validate("not-an-array" as any, mockArgs);

        // Assert
        expect(result).toBe(false);
      });

      it("应该接受包含有效符号的数组", () => {
        // Arrange
        const validSymbols = ["AAPL", "MSFT", "700.HK", "000001.SZ"];
        const mockArgs: ValidationArguments = {
          object: { queryType: QueryType.BY_SYMBOLS } as QueryRequestDto,
          property: "symbols",
          value: validSymbols,
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act
        const result = validator.validate(validSymbols, mockArgs);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("当查询类型不是BY_SYMBOLS时", () => {
      const testCases = [
        { queryType: QueryType.BY_MARKET, description: "BY_MARKET" },
        { queryType: QueryType.BY_PROVIDER, description: "BY_PROVIDER" },
        { queryType: QueryType.BY_CATEGORY, description: "BY_CATEGORY" },
        { queryType: QueryType.BY_TIME_RANGE, description: "BY_TIME_RANGE" },
        { queryType: QueryType.ADVANCED, description: "ADVANCED" },
      ];

      testCases.forEach(({ queryType, description }) => {
        it(`应该对${description}查询类型允许空的symbols`, () => {
          // Arrange
          const mockArgs: ValidationArguments = {
            object: { queryType } as QueryRequestDto,
            property: "symbols",
            value: [],
            const_raints: [],
            targetName: "QueryRequestDto",
          };

          // Act
          const result = validator.validate([], mockArgs);

          // Assert
          expect(result).toBe(true);
        });

        it(`应该对${description}查询类型允许undefined的symbols`, () => {
          // Arrange
          const mockArgs: ValidationArguments = {
            object: { queryType } as QueryRequestDto,
            property: "symbols",
            value: undefined,
            const_raints: [],
            targetName: "QueryRequestDto",
          };

          // Act
          const result = validator.validate(undefined, mockArgs);

          // Assert
          expect(result).toBe(true);
        });

        it(`应该对${description}查询类型允许有效的symbols数组`, () => {
          // Arrange
          const symbols = ["AAPL", "MSFT"];
          const mockArgs: ValidationArguments = {
            object: { queryType } as QueryRequestDto,
            property: "symbols",
            value: symbols,
            const_raints: [],
            targetName: "QueryRequestDto",
          };

          // Act
          const result = validator.validate(symbols, mockArgs);

          // Assert
          expect(result).toBe(true);
        });
      });
    });

    describe("边界情况", () => {
      it("应该处理没有queryType的对象", () => {
        // Arrange
        const mockArgs: ValidationArguments = {
          object: {} as QueryRequestDto, // 没有queryType
          property: "symbols",
          value: ["AAPL"],
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act
        const result = validator.validate(["AAPL"], mockArgs);

        // Assert
        expect(result).toBe(true); // 不是BY_SYMBOLS，所以应该通过
      });

      it("应该处理null对象", () => {
        // Arrange
        const mockArgs: ValidationArguments = {
          object: null as any,
          property: "symbols",
          value: ["AAPL"],
          const_raints: [],
          targetName: "QueryRequestDto",
        };

        // Act & Assert - 不应该抛出异常
        expect(() => validator.validate(["AAPL"], mockArgs)).not.toThrow();
      });
    });
  });

  describe("defaultMessage", () => {
    it("应该为BY_SYMBOLS查询类型返回错误消息", () => {
      // Arrange
      const mockArgs: ValidationArguments = {
        object: { queryType: QueryType.BY_SYMBOLS } as QueryRequestDto,
        property: "symbols",
        value: [],
        const_raints: [],
        targetName: "QueryRequestDto",
      };

      // Act
      const message = validator.defaultMessage(mockArgs);

      // Assert
      expect(message).toBe(
        "symbols字段对于BY_SYMBOLS查询类型是必需的，且不能为空",
      );
    });

    it("应该为其他查询类型返回空消息", () => {
      // Arrange
      const mockArgs: ValidationArguments = {
        object: { queryType: QueryType.BY_MARKET } as QueryRequestDto,
        property: "symbols",
        value: [],
        const_raints: [],
        targetName: "QueryRequestDto",
      };

      // Act
      const message = validator.defaultMessage(mockArgs);

      // Assert
      expect(message).toBe("");
    });

    it("应该为没有queryType的对象返回空消息", () => {
      // Arrange
      const mockArgs: ValidationArguments = {
        object: {} as QueryRequestDto,
        property: "symbols",
        value: [],
        const_raints: [],
        targetName: "QueryRequestDto",
      };

      // Act
      const message = validator.defaultMessage(mockArgs);

      // Assert
      expect(message).toBe("");
    });

    it("应该为null对象返回空消息而不抛出异常", () => {
      // Arrange
      const mockArgs: ValidationArguments = {
        object: null as any,
        property: "symbols",
        value: [],
        const_raints: [],
        targetName: "QueryRequestDto",
      };

      // Act & Assert
      expect(() => validator.defaultMessage(mockArgs)).not.toThrow();
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe("");
    });

    it("应该为未定义的queryType返回空消息", () => {
      // Arrange
      const mockArgs: ValidationArguments = {
        object: { queryType: undefined as any } as QueryRequestDto,
        property: "symbols",
        value: [],
        const_raints: [],
        targetName: "QueryRequestDto",
      };

      // Act
      const message = validator.defaultMessage(mockArgs);

      // Assert
      expect(message).toBe("");
    });
  });
});
