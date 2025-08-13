
// 从 @nestjs/common 模块导入用于验证管道的 ValidationPipe
import { ValidationPipe } from "@nestjs/common";
// 从 class-transformer 模块导入 plainToClass 用于将普通对象转换为类实例
import { plainToClass } from "class-transformer";
// 导入需要测试的 DTO 类
import {
  UpdateSymbolMappingDto,
  TransformSymbolsDto,
  AddSymbolMappingRuleDto,
  UpdateSymbolMappingRuleDto,
} from '@core/symbol-mapper/dto/update-symbol-mapping.dto';
// 导入 create-symbol-mapping.dto.ts 文件中的 SymbolMappingRuleDto 类


// 测试 UpdateSymbolMappingDto
describe("UpdateSymbolMappingDto", () => {
  // 创建一个验证管道实例，用于后续的验证操作
  const validator = new ValidationPipe({
    transform: true, // 自动将普通对象转换为 DTO 类的实例
    whitelist: true, // 自动移除 DTO 中未定义的属性
    forbidNonWhitelisted: true, // 如果存在未在 DTO 中定义的属性，则抛出错误
  });

  // 测试当所有字段都有效时的情况
  it("应该在所有字段都有效时验证通过", async () => {
    // 创建一个有效的 DTO 实例
    const dto = plainToClass(UpdateSymbolMappingDto, {
      dataSourceName: "test_source",
      SymbolMappingRule: [{ standardSymbol: "APPL", sdkSymbol: "Apple" }],
    });
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, {
      metatype: UpdateSymbolMappingDto,
      type: "body",
    });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });

  // 测试当字段为空时的情况
  it("应该在字段为空时验证通过", async () => {
    // 创建一个空的 DTO 实例
    const dto = plainToClass(UpdateSymbolMappingDto, {});
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, {
      metatype: UpdateSymbolMappingDto,
      type: "body",
    });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });
});

// 测试 TransformSymbolsDto
describe("TransformSymbolsDto", () => {
  // 创建一个验证管道实例
  const validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  // 测试当 mappingInSymbolId 存在时的情况
  it("当 mappingInSymbolId 存在时，应该验证通过", async () => {
    // 创建一个有效的 DTO 实例
    const dto = plainToClass(TransformSymbolsDto, {
      mappingInSymbolId: "some-id",
      symbols: ["AAPL.US", "GOOG.US"],
    });
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, {
      metatype: TransformSymbolsDto,
      type: "body",
    });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });

  // 测试当 dataSourceName 存在时的情况
  it("当 dataSourceName 存在时，应该验证通过", async () => {
    // 创建一个有效的 DTO 实例
    const dto = plainToClass(TransformSymbolsDto, {
      dataSourceName: "test_source",
      symbols: ["AAPL.US", "GOOG.US"],
    });
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, {
      metatype: TransformSymbolsDto,
      type: "body",
    });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });

  // 测试当 mappingInSymbolId 和 dataSourceName 都不存在时的情况
  it("当 mappingInSymbolId 和 dataSourceName 都不存在时，应该验证失败", async () => {
    // 创建一个无效的 DTO 实例
    const dto = plainToClass(TransformSymbolsDto, {
      symbols: ["AAPL.US", "GOOG.US"],
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(
      validator.transform(dto, {
        metatype: TransformSymbolsDto,
        type: "body",
      }),
    ).rejects.toThrow();
  });

  // 测试当 symbols 列表为空时的情况
  it("当 symbols 列表为空时，应该验证失败", async () => {
    // 创建一个无效的 DTO 实例
    const dto = plainToClass(TransformSymbolsDto, {
      dataSourceName: "test_source",
      symbols: [],
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(
      validator.transform(dto, {
        metatype: TransformSymbolsDto,
        type: "body",
      }),
    ).rejects.toThrow();
  });
});

// 测试 AddSymbolMappingRuleDto
describe("AddSymbolMappingRuleDto", () => {
  // 创建一个验证管道实例
  const validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  // 测试当所有字段都有效时的情况
  it("应该在所有字段都有效时验证通过", async () => {
    // 创建一个有效的 DTO 实例
    const dto = plainToClass(AddSymbolMappingRuleDto, {
      dataSourceName: "test_source",
      symbolMappingRule: {
        standardSymbol: "APPL",
        sdkSymbol: "Apple",
        matchRule: "exact",
      },
    });
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, {
      metatype: AddSymbolMappingRuleDto,
      type: "body",
    });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });

  // 测试当 dataSourceName 为空时的情况
  it("当 dataSourceName 为空时，应该验证失败", async () => {
    // 创建一个无效的 DTO 实例
    const dto = plainToClass(AddSymbolMappingRuleDto, {
      symbolMappingRule: {
        standardSymbol: "APPL",
        sdkSymbol: "Apple",
        matchRule: "exact",
      },
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(
      validator.transform(dto, {
        metatype: AddSymbolMappingRuleDto,
        type: "body",
      }),
    ).rejects.toThrow();
  });
});

// 测试 UpdateSymbolMappingRuleDto
describe("UpdateSymbolMappingRuleDto", () => {
  // 创建一个验证管道实例
  const validator = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  // 测试当所有字段都有效时的情况
  it("应该在所有字段都有效时验证通过", async () => {
    // 创建一个有效的 DTO 实例
    const dto = plainToClass(UpdateSymbolMappingRuleDto, {
      dataSourceName: "test_source",
      standardSymbol: "APPL",
      symbolMappingRule: { sdkSymbol: "NewApple" },
    });
    // 使用验证管道进行验证，期望没有错误
    const errors = await validator.transform(dto, {
      metatype: UpdateSymbolMappingRuleDto,
      type: "body",
    });
    // 断言验证结果与原始 DTO 对象相等
    expect(errors).toEqual(dto);
  });

  // 测试当 dataSourceName 为空时的情况
  it("当 dataSourceName 为空时，应该验证失败", async () => {
    // 创建一个无效的 DTO 实例
    const dto = plainToClass(UpdateSymbolMappingRuleDto, {
      standardSymbol: "APPL",
      symbolMappingRule: { sdkSymbol: "NewApple" },
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(
      validator.transform(dto, {
        metatype: UpdateSymbolMappingRuleDto,
        type: "body",
      }),
    ).rejects.toThrow();
  });

  // 测试当 standardSymbol 为空时的情况
  it("当 standardSymbol 为空时，应该验证失败", async () => {
    // 创建一个无效的 DTO 实例
    const dto = plainToClass(UpdateSymbolMappingRuleDto, {
      dataSourceName: "test_source",
      symbolMappingRule: { sdkSymbol: "NewApple" },
    });
    // 使用验证管道进行验证，期望捕获到错误
    await expect(
      validator.transform(dto, {
        metatype: UpdateSymbolMappingRuleDto,
        type: "body",
      }),
    ).rejects.toThrow();
  });
});
