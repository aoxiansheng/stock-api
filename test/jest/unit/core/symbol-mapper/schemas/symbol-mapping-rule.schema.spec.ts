import { Model } from "mongoose";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  SymbolMappingRule,
  SymbolMappingRuleDocument,
  SymbolMappingRuleSchema,
  MappingRule,
} from "../../../../../../src/core/symbol-mapper/schemas/symbol-mapping-rule.schema";

describe("SymbolMappingRule Schema", () => {
  let mongoServer: MongoMemoryServer;
  let symbolMappingRuleModel: Model<SymbolMappingRuleDocument>;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: SymbolMappingRule.name, schema: SymbolMappingRuleSchema },
        ]),
      ],
    }).compile();

    symbolMappingRuleModel = moduleRef.get<Model<SymbolMappingRuleDocument>>(
      getModelToken(SymbolMappingRule.name),
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
    const mappingRules: MappingRule[] = [
      {
        inputSymbol: "700.HK",
        outputSymbol: "00700",
        market: "HK",
        symbolType: "stock",
        isActive: true,
        description: "腾讯控股港股映射",
      },
      {
        inputSymbol: "AAPL.US",
        outputSymbol: "AAPL",
        market: "US",
        symbolType: "stock",
        isActive: true,
        description: "苹果美股映射",
      },
    ];

    const ruleData = {
      dataSourceName: "longport",
      mappingRules,
      description: "LongPort数据源符号映射规则",
      version: "1.0.0",
      isActive: true,
      createdBy: "system",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    expect(savedRule.dataSourceName).toBe(ruleData.dataSourceName);
    expect(savedRule.mappingRules).toHaveLength(2);
    expect(savedRule.mappingRules[0].inputSymbol).toBe("700.HK");
    expect(savedRule.mappingRules[0].outputSymbol).toBe("00700");
    expect(savedRule.mappingRules[1].inputSymbol).toBe("AAPL.US");
    expect(savedRule.mappingRules[1].outputSymbol).toBe("AAPL");
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

    expect(savedRule.mappingRules).toEqual([]); // 默认空数组
    expect(savedRule.isActive).toBe(true); // 默认值
  });

  it("应该正确序列化对象（toJSON方法）", async () => {
    const ruleData = {
      dataSourceName: "json-test-provider",
      mappingRules: [
        {
          inputSymbol: "TEST.HK",
          outputSymbol: "TEST",
          market: "HK",
          symbolType: "stock",
        },
      ],
      description: "JSON测试",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();
    const jsonRule = savedRule.toJSON();

    expect(jsonRule.id).toBeDefined();
    expect(jsonRule._id).toBeUndefined(); // 被移除
    expect(jsonRule.__v).toBeUndefined(); // 被移除
    expect(jsonRule.dataSourceName).toBe(ruleData.dataSourceName);

    // 验证嵌套的 mappingRules，并考虑默认值
    const expectedMappingRules = ruleData.mappingRules.map((rule) => ({
      ...rule,
      isActive: true, // 验证默认值是否已应用
    }));
    expect(jsonRule.mappingRules).toEqual(expectedMappingRules);
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
      mappingRules: [
        {
          inputSymbol: "DEFAULT.TEST",
          outputSymbol: "DEFAULT",
          // 其他字段使用默认值
        },
      ],
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    const mappingRule = savedRule.mappingRules[0];
    expect(mappingRule.isActive).toBe(true); // 默认值
    expect(mappingRule.market).toBeUndefined(); // 可选字段
    expect(mappingRule.symbolType).toBeUndefined(); // 可选字段
    expect(mappingRule.description).toBeUndefined(); // 可选字段
  });

  it("应该支持复杂的映射规则配置", async () => {
    const complexMappingRules: MappingRule[] = [
      // 港股映射
      {
        inputSymbol: "700.HK",
        outputSymbol: "00700",
        market: "HK",
        symbolType: "stock",
        isActive: true,
        description: "腾讯控股",
      },
      {
        inputSymbol: "941.HK",
        outputSymbol: "00941",
        market: "HK",
        symbolType: "stock",
        isActive: true,
        description: "中国移动",
      },
      // 美股映射
      {
        inputSymbol: "AAPL.US",
        outputSymbol: "AAPL",
        market: "US",
        symbolType: "stock",
        isActive: true,
        description: "苹果公司",
      },
      {
        inputSymbol: "MSFT.US",
        outputSymbol: "MSFT",
        market: "US",
        symbolType: "stock",
        isActive: true,
        description: "微软公司",
      },
      // A股映射
      {
        inputSymbol: "000001.SZ",
        outputSymbol: "000001",
        market: "CN",
        symbolType: "stock",
        isActive: true,
        description: "平安银行",
      },
      {
        inputSymbol: "600036.SH",
        outputSymbol: "600036",
        market: "CN",
        symbolType: "stock",
        isActive: true,
        description: "招商银行",
      },
      // ETF映射
      {
        inputSymbol: "SPY.US",
        outputSymbol: "SPY",
        market: "US",
        symbolType: "etf",
        isActive: true,
        description: "SPDR S&P 500 ETF",
      },
      // 指数映射
      {
        inputSymbol: "HSI.HK",
        outputSymbol: "HSI",
        market: "HK",
        symbolType: "index",
        isActive: true,
        description: "恒生指数",
      },
      // 禁用的映射
      {
        inputSymbol: "DEPRECATED.TEST",
        outputSymbol: "DEPRECATED",
        market: "TEST",
        symbolType: "stock",
        isActive: false,
        description: "已废弃的测试符号",
      },
    ];

    const ruleData = {
      dataSourceName: "complex-provider",
      mappingRules: complexMappingRules,
      description: "复杂的多市场符号映射规则",
      version: "2.1.0",
      isActive: true,
      createdBy: "admin@example.com",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    expect(savedRule.mappingRules).toHaveLength(9);

    // 验证港股映射
    const hkStocks = savedRule.mappingRules.filter(
      (r) => r.market === "HK" && r.symbolType === "stock",
    );
    expect(hkStocks).toHaveLength(2);
    expect(hkStocks.find((s) => s.inputSymbol === "700.HK")?.outputSymbol).toBe(
      "00700",
    );

    // 验证美股映射
    const usStocks = savedRule.mappingRules.filter(
      (r) => r.market === "US" && r.symbolType === "stock",
    );
    expect(usStocks).toHaveLength(2);
    expect(
      usStocks.find((s) => s.inputSymbol === "AAPL.US")?.outputSymbol,
    ).toBe("AAPL");

    // 验证A股映射
    const cnStocks = savedRule.mappingRules.filter((r) => r.market === "CN");
    expect(cnStocks).toHaveLength(2);
    expect(
      cnStocks.find((s) => s.inputSymbol === "000001.SZ")?.outputSymbol,
    ).toBe("000001");

    // 验证ETF映射
    const etfs = savedRule.mappingRules.filter((r) => r.symbolType === "etf");
    expect(etfs).toHaveLength(1);
    expect(etfs[0].inputSymbol).toBe("SPY.US");

    // 验证指数映射
    const indexes = savedRule.mappingRules.filter(
      (r) => r.symbolType === "index",
    );
    expect(indexes).toHaveLength(1);
    expect(indexes[0].inputSymbol).toBe("HSI.HK");

    // 验证禁用的映射
    const inactiveRules = savedRule.mappingRules.filter((r) => !r.isActive);
    expect(inactiveRules).toHaveLength(1);
    expect(inactiveRules[0].inputSymbol).toBe("DEPRECATED.TEST");
  });

  it("应该创建索引", async () => {
    // 先创建一些数据以确保索引被建立
    const rule = new symbolMappingRuleModel({
      dataSourceName: "index-test-provider",
      mappingRules: [
        {
          inputSymbol: "INDEX.TEST",
          outputSymbol: "INDEX",
          market: "TEST",
        },
      ],
    });
    await rule.save();

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

    // 查找mappingRules.inputSymbol索引
    const inputSymbolIndex = indexes.find(
      (index) =>
        index.key &&
        Object.keys(index.key).includes("mappingRules.inputSymbol"),
    );
    expect(inputSymbolIndex).toBeDefined();

    // 查找mappingRules.market索引
    const marketIndex = indexes.find(
      (index) =>
        index.key && Object.keys(index.key).includes("mappingRules.market"),
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
      mappingRules: [
        {
          inputSymbol: "FIRST.TEST",
          outputSymbol: "FIRST",
        },
      ],
    };

    // 创建第一个规则
    const firstRule = new symbolMappingRuleModel(ruleData);
    await firstRule.save();

    // 尝试创建具有相同dataSourceName的规则
    const duplicateRule = new symbolMappingRuleModel({
      ...ruleData,
      mappingRules: [
        {
          inputSymbol: "SECOND.TEST",
          outputSymbol: "SECOND",
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
      mappingRules: [
        {
          inputSymbol: "OLD.SYMBOL",
          outputSymbol: "OLD",
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
    savedRule.mappingRules = [
      {
        inputSymbol: "NEW.SYMBOL",
        outputSymbol: "NEW",
        market: "TEST",
        symbolType: "stock",
        isActive: true,
        description: "更新后的符号",
      },
      {
        inputSymbol: "ANOTHER.SYMBOL",
        outputSymbol: "ANOTHER",
        market: "TEST",
        symbolType: "etf",
        isActive: true,
        description: "新增的符号",
      },
    ];
    savedRule.version = "2.0.0";
    savedRule.description = "更新后的映射规则";

    const updatedRule = await savedRule.save();

    expect(updatedRule.mappingRules).toHaveLength(2);
    expect(updatedRule.mappingRules[0].inputSymbol).toBe("NEW.SYMBOL");
    expect(updatedRule.mappingRules[1].inputSymbol).toBe("ANOTHER.SYMBOL");
    expect(updatedRule.version).toBe("2.0.0");
    expect(updatedRule.description).toBe("更新后的映射规则");
    expect(updatedRule.updatedAt.getTime()).toBeGreaterThan(
      updatedRule.createdAt.getTime(),
    );
  });

  it("应该支持不同符号类型", async () => {
    const symbolTypes = ["stock", "etf", "index", "crypto", "forex"];

    const mappingRules: MappingRule[] = symbolTypes.map((type) => ({
      inputSymbol: `${type.toUpperCase()}.TEST`,
      outputSymbol: type.toUpperCase(),
      market: "TEST",
      symbolType: type,
      isActive: true,
      description: `${type}类型测试`,
    }));

    const ruleData = {
      dataSourceName: "symbol-types-provider",
      mappingRules,
      description: "不同符号类型测试",
    };

    const rule = new symbolMappingRuleModel(ruleData);
    const savedRule = await rule.save();

    expect(savedRule.mappingRules).toHaveLength(symbolTypes.length);

    symbolTypes.forEach((type) => {
      const matchingRule = savedRule.mappingRules.find(
        (r) => r.symbolType === type,
      );
      expect(matchingRule).toBeDefined();
      expect(matchingRule?.inputSymbol).toBe(`${type.toUpperCase()}.TEST`);
    });
  });

  it("应该支持映射规则的批量操作", async () => {
    // 创建多个数据源的映射规则
    const providers = ["provider-a", "provider-b", "provider-c"];

    const rules = await Promise.all(
      providers.map(async (provider) => {
        const ruleData = {
          dataSourceName: provider,
          mappingRules: [
            {
              inputSymbol: `SYMBOL.TEST`,
              outputSymbol: `OUTPUT`,
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
      expect(rule.mappingRules[0].inputSymbol).toBe(`SYMBOL.TEST`);
    });

    // 验证查询能力
    const activeRules = await symbolMappingRuleModel.find({ isActive: true });
    expect(activeRules).toHaveLength(3);

    const providerARule = await symbolMappingRuleModel.findOne({
      dataSourceName: "provider-a",
    });
    expect(providerARule).toBeDefined();
    expect(providerARule?.mappingRules[0].outputSymbol).toBe("OUTPUT");
  });
});
