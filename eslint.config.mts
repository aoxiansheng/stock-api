import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  {
    name: "data-mapper-constants-enforcement",
    files: ["src/core/00-prepare/data-mapper/**/*.{ts,js}"],
    ignores: ["**/constants/**/*.{ts,js}"],
    rules: {
      // 禁止在 data-mapper 模块中硬编码转换类型
      "no-restricted-syntax": [
        "error",
        {
          selector: "ArrayExpression:has(Literal[value='multiply'], Literal[value='divide'], Literal[value='add'], Literal[value='subtract'], Literal[value='format'], Literal[value='custom'], Literal[value='none'])",
          message: "请使用 TRANSFORMATION_TYPE_VALUES 常量而不是硬编码转换类型数组。导入路径: '../constants/data-mapper.constants'"
        },
        {
          selector: "ArrayExpression:has(Literal[value='rest'], Literal[value='stream'])",
          message: "请使用 API_TYPE_VALUES 常量而不是硬编码API类型数组。导入路径: '../constants/data-mapper.constants'"
        },
        {
          selector: "ArrayExpression:has(Literal[value='quote_fields'], Literal[value='basic_info_fields'], Literal[value='index_fields'])",
          message: "请使用 RULE_LIST_TYPE_VALUES 或 COMMON_RULE_LIST_TYPE_VALUES 常量而不是硬编码规则类型数组。导入路径: '../constants/data-mapper.constants'"
        },
        {
          selector: "Literal[value='multiply']:not(:has(~ ImportSpecifier[imported.name='TRANSFORMATION_TYPES']))",
          message: "请使用 TRANSFORMATION_TYPES.MULTIPLY 而不是硬编码 'multiply' 字符串"
        },
        {
          selector: "Literal[value='divide']:not(:has(~ ImportSpecifier[imported.name='TRANSFORMATION_TYPES']))",
          message: "请使用 TRANSFORMATION_TYPES.DIVIDE 而不是硬编码 'divide' 字符串"
        },
        {
          selector: "Literal[value='add']:not(:has(~ ImportSpecifier[imported.name='TRANSFORMATION_TYPES']))",
          message: "请使用 TRANSFORMATION_TYPES.ADD 而不是硬编码 'add' 字符串"
        },
        {
          selector: "Literal[value='subtract']:not(:has(~ ImportSpecifier[imported.name='TRANSFORMATION_TYPES']))",
          message: "请使用 TRANSFORMATION_TYPES.SUBTRACT 而不是硬编码 'subtract' 字符串"
        },
        {
          selector: "Literal[value='format']:not(:has(~ ImportSpecifier[imported.name='TRANSFORMATION_TYPES']))",
          message: "请使用 TRANSFORMATION_TYPES.FORMAT 而不是硬编码 'format' 字符串"
        },
        {
          selector: "Literal[value='custom']:not(:has(~ ImportSpecifier[imported.name='TRANSFORMATION_TYPES']))",
          message: "请使用 TRANSFORMATION_TYPES.CUSTOM 而不是硬编码 'custom' 字符串"
        },
        {
          selector: "Literal[value='none']:not(:has(~ ImportSpecifier[imported.name='TRANSFORMATION_TYPES']))",
          message: "请使用 TRANSFORMATION_TYPES.NONE 而不是硬编码 'none' 字符串"
        },
        {
          selector: "Literal[value='rest']:not(:has(~ ImportSpecifier[imported.name='API_TYPES']))",
          message: "请使用 API_TYPES.REST 而不是硬编码 'rest' 字符串"
        },
        {
          selector: "Literal[value='stream']:not(:has(~ ImportSpecifier[imported.name='API_TYPES']))",
          message: "请使用 API_TYPES.STREAM 而不是硬编码 'stream' 字符串"
        }
      ]
    }
  },
  {
    name: "transformer-module-constants-enforcement",
    files: ["src/core/02-processing/transformer/**/*.{ts,js}"],
    ignores: ["**/constants/**/*.{ts,js}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ArrayExpression:has(Literal[value='multiply'], Literal[value='divide'], Literal[value='add'], Literal[value='subtract'], Literal[value='format'], Literal[value='custom'], Literal[value='none'])",
          message: "请使用 TRANSFORMATION_TYPE_VALUES 常量而不是硬编码转换类型数组。导入路径: '../../00-prepare/data-mapper/constants/data-mapper.constants'"
        }
      ]
    }
  },
  {
    name: "global-enum-constants-enforcement",
    files: ["src/**/*.{ts,js}"],
    ignores: ["**/constants/**/*.{ts,js}", "**/*.constants.{ts,js}"],
    rules: {
      // 全局规则：建议使用常量而不是硬编码重复的字符串
      "no-restricted-syntax": [
        "warn", 
        {
          selector: "ArrayExpression:has(Literal[value='multiply'], Literal[value='divide'], Literal[value='add']) ~ ArrayExpression:has(Literal[value='multiply'], Literal[value='divide'], Literal[value='add'])",
          message: "检测到重复的转换类型数组，考虑使用统一的常量定义"
        }
      ]
    }
  },
  {
    name: "time-fields-standardization",
    files: ["src/**/*.{ts,js}"],
    ignores: ["**/constants/**/*.{ts,js}", "**/*.constants.{ts,js}", "**/migration/**/*.{ts,js}", "**/legacy/**/*.{ts,js}"],
    rules: {
      // 时间字段标准化规则
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='responseTime'][value.type!='TSTypeReference']",
          message: "使用 responseTimeMs 代替 responseTime 以明确时间单位。可使用 common/utils/time-fields-migration.util.ts 中的工具函数进行迁移"
        },
        {
          selector: "Property[key.name='averageResponseTime'][value.type!='TSTypeReference']",
          message: "使用 averageResponseTimeMs 代替 averageResponseTime 以明确时间单位。可使用 common/utils/time-fields-migration.util.ts 中的工具函数进行迁移"
        },
        {
          selector: "Property[key.name='averageQueryTime'][value.type!='TSTypeReference']",
          message: "使用 queryTimeMs 代替 averageQueryTime 以明确时间单位。可使用 common/utils/time-fields-migration.util.ts 中的工具函数进行迁移"
        },
        {
          selector: "Property[key.name='processingTime'][value.type!='TSTypeReference']",
          message: "使用 processingTimeMs 代替 processingTime 以明确时间单位。可使用 common/utils/time-fields-migration.util.ts 中的工具函数进行迁移"
        }
      ]
    }
  },
  {
    name: "time-interfaces-promotion",
    files: ["src/**/*.{ts,js}"],
    ignores: ["**/constants/**/*.{ts,js}", "**/*.constants.{ts,js}", "**/interfaces/**/*.{ts,js}"],
    rules: {
      // 推广使用标准时间接口
      "no-restricted-syntax": [
        "warn",
        {
          selector: "TSInterfaceDeclaration:has(TSPropertySignature[key.name='responseTimeMs']):not(:has(TSExpressionWithTypeArguments[expression.name='ResponseTimeFields']))",
          message: "考虑继承 ResponseTimeFields 接口以获得标准化的时间字段定义。导入路径: 'common/interfaces/time-fields.interface'"
        },
        {
          selector: "TSInterfaceDeclaration:has(TSPropertySignature[key.name='processingTimeMs']):not(:has(TSExpressionWithTypeArguments[expression.name='ProcessingTimeFields']))",
          message: "考虑继承 ProcessingTimeFields 接口以获得标准化的时间字段定义。导入路径: 'common/interfaces/time-fields.interface'"
        }
      ]
    }
  }
]);
