import { Model } from "mongoose";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  SymbolMappingRule,
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentType,
  SymbolMappingRuleDocumentSchema
} from "../../../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema";

describe("SymbolMappingRule Schema", () => {
  let mongoServer: MongoMemoryServer;
  let symbolMappingRuleModel: Model<SymbolMappingRuleDocumentType>;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
        ]),
      ],
    }).compile();

    symbolMappingRuleModel = moduleRef.get<Model<SymbolMappingRuleDocumentType>>(
      getModelToken(SymbolMappingRuleDocument.name),
    );
  });

  afterAll(async () => {
    await moduleRef.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await symbolMappingRuleModel.deleteMany({});
  });

  it("应该成功创建符号映射规则", async () => {
    const SymbolMappingRule: SymbolMappingRule[] = [
      {
        standardSymbol: "700.HK",
        sdkSymbol: "00700",
        market: "HK",
        symbolType: "stock",
        isActive: true,
        description: "腾讯控股港股映射",
      },
      {
        standardSymbol: "AAPL.US",
        sdkSymbol: "AAPL",
        market: "US",
        symbolType: "stock",
        isActive: true,
        description: "苹果美股映射",
      },
    ];

    const ruleData = {
      dataSourceName: "longport",
      SymbolMappingRule,
      description: "LongPort数据源符号映射规则",
      version: "1.0.0",
      isActive: true,
      createdBy: "system",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    expect(savedRule.dataSourceName).toBe(ruleData.dataSourceName);
    expect(savedRule.SymbolMappingRule).toHaveLength(2);
    expect(savedRule.SymbolMappingRule[0].standardSymbol).toBe("700.HK");
    expect(savedRule.SymbolMappingRule[0].sdkSymbol).toBe("00700");
    expect(savedRule.SymbolMappingRule[1].standardSymbol).toBe("AAPL.US");
    expect(savedRule.SymbolMappingRule[1].sdkSymbol).toBe("AAPL");
    expect(savedRule.description).toBe(ruleData.description);
    expect(savedRule.version).toBe(ruleData.version);
    expect(savedRule.isActive).toBe(true);
    expect(savedRule.createdBy).toBe(ruleData.createdBy);
    expect(savedRule.createdAt).toBeDefined();
    expect(savedRule.updatedAt).toBeDefined();
  });

  it("应该正确应用默认值", async () => {
    const minimalRuleData = {
      dataSourceName: "minimal-provider",
    };

    const rule = new symbolMappingRuleModel(minimalRuleData);
    const savedRule = await rule.save();

    expect(savedRule.SymbolMappingRule).toEqual([]); // 默认空数组
    expect(savedRule.isActive).toBe(true); // 默认值
  });

  it("应该正确序列化对象（toJSON方法）", async () => {
    const ruleData = {
      dataSourceName: "json-test-provider",
      SymbolMappingRule: [
        {
          standardSymbol: "TEST.HK",
          sdkSymbol: "TEST",
          market: "HK",
          symbolType: "stock",
        },
      ],
      description: "JSON测试",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();
    const jsonRule = savedRule.toJSON() as any;

    expect(jsonRule.id).toBeDefined();
    expect(jsonRule._id).toBeUndefined(); // 被移除
    expect(jsonRule.__v).toBeUndefined(); // 被移除
    expect(jsonRule.dataSourceName).toBe(ruleData.dataSourceName);

    // 验证嵌套的 SymbolMappingRule，并考虑默认值
    const expectedMappingRule = ruleData.SymbolMappingRule.map((rule) => ({
      ...rule,
      isActive: true, // 验证默认值是否已应用
    }));
    expect(jsonRule.SymbolMappingRule).toEqual(expectedMappingRule);
  });

  it("应该验证必填字段", async () => {
    const incompleteRule = new symbolMappingRuleModel({});

    try {
      await incompleteRule.validate();
      fail("应该抛出验证错误");
    } catch (error) {
      expect(error.errors.dataSourceName).toBeDefined();
    }
  });

  it("应该支持MappingRule的默认值", async () => {
    const ruleData = {
      dataSourceName: "mapping-rule-defaults",
      SymbolMappingRule: [
        {
          standardSymbol: "DEFAULT.TEST",
          sdkSymbol: "DEFAULT",
          // 其他字段使用默认值
        },
      ],
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    const transformMappingRule = savedRule.SymbolMappingRule[0];
    expect(transformMappingRule.isActive).toBe(true); // 默认值
    expect(transformMappingRule.market).toBeUndefined(); // 可选字段
    expect(transformMappingRule.symbolType).toBeUndefined(); // 可选字段
    expect(transformMappingRule.description).toBeUndefined(); // 可选字段
  });

  it("应该支持复杂的映射规则配置", async () => {
    const complexMappingRule: SymbolMappingRule[] = [
      // 港股映射
      {
        standardSymbol: "700.HK",
        sdkSymbol: "00700",
        market: "HK",
        symbolType: "stock",
        isActive: true,
        description: "腾讯控股",
      },
      {
        standardSymbol: "941.HK",
        sdkSymbol: "00941",
        market: "HK",
        symbolType: "stock",
        isActive: true,
        description: "中国移动",
      },
      // 美股映射
      {
        standardSymbol: "AAPL.US",
        sdkSymbol: "AAPL",
        market: "US",
        symbolType: "stock",
        isActive: true,
        description: "苹果公司",
      },
      {
        standardSymbol: "MSFT.US",
        sdkSymbol: "MSFT",
        market: "US",
        symbolType: "stock",
        isActive: true,
        description: "微软公司",
      },
      // A股映射
      {
        standardSymbol: "000001.SZ",
        sdkSymbol: "000001",
        market: "CN",
        symbolType: "stock",
        isActive: true,
        description: "平安银行",
      },
      {
        standardSymbol: "600036.SH",
        sdkSymbol: "600036",
        market: "CN",
        symbolType: "stock",
        isActive: true,
        description: "招商银行",
      },
      // ETF映射
      {
        standardSymbol: "SPY.US",
        sdkSymbol: "SPY",
        market: "US",
        symbolType: "etf",
        isActive: true,
        description: "SPDR S&P 500 ETF",
      },
      // 指数映射
      {
        standardSymbol: "HSI.HK",
        sdkSymbol: "HSI",
        market: "HK",
        symbolType: "index",
        isActive: true,
        description: "恒生指数",
      },
      // 禁用的映射
      {
        standardSymbol: "DEPRECATED.TEST",
        sdkSymbol: "DEPRECATED",
        market: "TEST",
        symbolType: "stock",
        isActive: false,
        description: "已废弃的测试符号",
      },
    ];

    const ruleData = {
      dataSourceName: "complex-provider",
      SymbolMappingRule: complexMappingRule,
      description: "复杂的多市场符号映射规则",
      version: "2.1.0",
      isActive: true,
      createdBy: "admin@example.com",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    expect(savedRule.SymbolMappingRule).toHaveLength(9);

    // 验证港股映射
    const hkStocks = savedRule.SymbolMappingRule.filter(
      (r) => r.market === "HK" && r.symbolType === "stock",
    );
    expect(hkStocks).toHaveLength(2);
    expect(hkStocks.find((s) => s.standardSymbol === "700.HK")?.sdkSymbol).toBe(
      "00700",
    );

    // 验证美股映射
    const usStocks = savedRule.SymbolMappingRule.filter(
      (r) => r.market === "US" && r.symbolType === "stock",
    );
    expect(usStocks).toHaveLength(2);
    expect(
      usStocks.find((s) => s.standardSymbol === "AAPL.US")?.sdkSymbol,
    ).toBe("AAPL");

    // 验证A股映射
    const cnStocks = savedRule.SymbolMappingRule.filter((r) => r.market === "CN");
    expect(cnStocks).toHaveLength(2);
    expect(
      cnStocks.find((s) => s.standardSymbol === "000001.SZ")?.sdkSymbol,
    ).toBe("000001");

    // 验证ETF映射
    const etfs = savedRule.SymbolMappingRule.filter((r) => r.symbolType === "etf");
    expect(etfs).toHaveLength(1);
    expect(etfs[0].standardSymbol).toBe("SPY.US");

    // 验证指数映射
    const indexes = savedRule.SymbolMappingRule.filter(
      (r) => r.symbolType === "index",
    );
    expect(indexes).toHaveLength(1);
    expect(indexes[0].standardSymbol).toBe("HSI.HK");

    // 验证禁用的映射
    const inactiveRules = savedRule.SymbolMappingRule.filter((r) => !r.isActive);
    expect(inactiveRules).toHaveLength(1);
    expect(inactiveRules[0].standardSymbol).toBe("DEPRECATED.TEST");
  });

  it("应该创建索引", async () => {
    // 先创建一些数据以确保索引被建立
    const rule = new symbolMappingRuleModel({
      dataSourceName: "index-test-provider",
      SymbolMappingRule: [
        {
          standardSymbol: "INDEX.TEST",
          sdkSymbol: "INDEX",
          market: "TEST",
        },
      ],
    });
    await rule.save();

    // 等待索引创建完成，MongoDB Memory Server可能需要额外时间
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const indexes = await symbolMappingRuleModel.collection.indexes();

    // 查找dataSourceName的唯一索引
    const dataSourceNameIndex = indexes.find(
      (index) =>
        index.key &&
        Object.keys(index.key).includes("dataSourceName") &&
        index.unique,
    );
    expect(dataSourceNameIndex).toBeDefined();

    // 查找isActive索引
    const isActiveIndex = indexes.find(
      (index) => index.key && Object.keys(index.key).includes("isActive"),
    );
    expect(isActiveIndex).toBeDefined();

    // 查找symbolMappingRule.standardSymbol索引
    const standardSymbolIndex = indexes.find(
      (index) =>
        index.key &&
        Object.keys(index.key).includes("SymbolMappingRule.standardSymbol"),
    );
    expect(standardSymbolIndex).toBeDefined();

    // 查找symbolMappingRule.market索引
    const marketIndex = indexes.find(
      (index) =>
        index.key && Object.keys(index.key).includes("SymbolMappingRule.market"),
    );
    expect(marketIndex).toBeDefined();

    // 查找createdAt索引
    const createdAtIndex = indexes.find(
      (index) => index.key && Object.keys(index.key).includes("createdAt"),
    );
    expect(createdAtIndex).toBeDefined();
  });

  it("应该验证dataSourceName的唯一性", async () => {
    const ruleData = {
      dataSourceName: "duplicate-provider",
      SymbolMappingRule: [
        {
          standardSymbol: "FIRST.TEST",
          sdkSymbol: "FIRST",
        },
      ],
    };

    // 创建第一个规则
    const firstRule = new symbolMappingRuleModel(ruleData);
    await firstRule.save();

    // 尝试创建具有相同dataSourceName的规则
    const duplicateRule = new symbolMappingRuleModel({
      ...ruleData,
      SymbolMappingRule: [
        {
          standardSymbol: "SECOND.TEST",
          sdkSymbol: "SECOND",
        },
      ],
    });

    try {
      await duplicateRule.save();
      fail("应该抛出唯一性验证错误");
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB 唯一性约束错误代码
    }
  });

  it("应该支持映射规则的动态更新", async () => {
    const initialData = {
      dataSourceName: "dynamic-update-provider",
      SymbolMappingRule: [
        {
          standardSymbol: "OLD.SYMBOL",
          sdkSymbol: "OLD",
          market: "TEST",
          symbolType: "stock",
          isActive: true,
        },
      ],
      version: "1.0.0",
    };

    const rule = new symbolMappingRuleModel(initialData);
    const savedRule = await rule.save();

    // 更新映射规则
    savedRule.SymbolMappingRule = [
      {
        standardSymbol: "NEW.SYMBOL",
        sdkSymbol: "NEW",
        market: "TEST",
        symbolType: "stock",
        isActive: true,
        description: "更新后的符号",
      },
      {
        standardSymbol: "ANOTHER.SYMBOL",
        sdkSymbol: "ANOTHER",
        market: "TEST",
        symbolType: "etf",
        isActive: true,
        description: "新增的符号",
      },
    ];
    savedRule.version = "2.0.0";
    savedRule.description = "更新后的映射规则";

    const updatedRule = await savedRule.save();

    expect(updatedRule.SymbolMappingRule).toHaveLength(2);
    expect(updatedRule.SymbolMappingRule[0].standardSymbol).toBe("NEW.SYMBOL");
    expect(updatedRule.SymbolMappingRule[1].standardSymbol).toBe("ANOTHER.SYMBOL");
    expect(updatedRule.version).toBe("2.0.0");
    expect(updatedRule.description).toBe("更新后的映射规则");
    
    // 使用正确的类型比较时间戳
    const createdAt = updatedRule.createdAt as Date;
    const updatedAt = updatedRule.updatedAt as Date;
    expect(updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
  });

  it("应该支持不同符号类型", async () => {
    const symbolTypes = ["stock", "etf", "index", "crypto", "forex"];

    const SymbolMappingRule: SymbolMappingRule[] = symbolTypes.map((type) => ({
      standardSymbol: `${type.toUpperCase()}.TEST`,
      sdkSymbol: type.toUpperCase(),
      market: "TEST",
      symbolType: type,
      isActive: true,
      description: `${type}类型测试`,
    }));

    const ruleData = {
      dataSourceName: "symbol-types-provider",
      SymbolMappingRule,
      description: "不同符号类型测试",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    expect(savedRule.SymbolMappingRule).toHaveLength(symbolTypes.length);

    symbolTypes.forEach((type) => {
      const matchingRule = savedRule.SymbolMappingRule.find(
        (r) => r.symbolType === type,
      );
      expect(matchingRule).toBeDefined();
      expect(matchingRule?.standardSymbol).toBe(`${type.toUpperCase()}.TEST`);
    });
  });

  it("应该支持映射规则的批量操作", async () => {
    // 创建多个数据源的映射规则
    const providers = ["provider-a", "provider-b", "provider-c"];

    const rules = await Promise.all(
      providers.map(async (provider) => {
        const ruleData = {
          dataSourceName: provider,
          SymbolMappingRule: [
            {
              standardSymbol: `SYMBOL.TEST`,
              sdkSymbol: `OUTPUT`,
              market: "TEST",
              symbolType: "stock",
              isActive: true,
            },
          ],
          version: "1.0.0",
        };

        const rule = new symbolMappingRuleModel(ruleData);
        return await rule.save();
      }),
    );

    expect(rules).toHaveLength(3);
    rules.forEach((rule) => {
      expect(rule.dataSourceName).toBeDefined();
      expect(rule.SymbolMappingRule[0].standardSymbol).toBe(`SYMBOL.TEST`);
    });

    // 验证查询能力
    const activeRules = await symbolMappingRuleModel.find({ isActive: true });
    expect(activeRules).toHaveLength(3);

    const providerARule = await symbolMappingRuleModel.findOne({
      dataSourceName: "provider-a",
    });
    expect(providerARule).toBeDefined();
    expect(providerARule?.SymbolMappingRule[0].sdkSymbol).toBe("OUTPUT");
  });
});
