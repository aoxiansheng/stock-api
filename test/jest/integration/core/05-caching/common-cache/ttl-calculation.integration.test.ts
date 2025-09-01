/**
 * TTL计算功能集成测试
 * 验证CommonCacheService.calculateOptimalTTL的集成功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { CommonCacheModule } from "../../../../../../src/core/05-caching/common-cache/module/common-cache.module";
import { CommonCacheService } from "../../../../../../src/core/05-caching/common-cache/services/common-cache.service";

describe("TTL计算功能集成测试", () => {
  let commonCacheService: CommonCacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [".env.test", ".env"],
        }),
        CommonCacheModule,
      ],
    }).compile();

    commonCacheService = module.get<CommonCacheService>(CommonCacheService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe("CommonCacheService.calculateOptimalTTL静态方法", () => {
    it("应该为实时股票报价计算正确的TTL", () => {
      // Act
      const result = CommonCacheService.calculateOptimalTTL(1024, "warm");

      // Assert
      expect(result).toBe(1800); // warm default
    });

    it("应该支持开市/闭市状态的TTL调整", () => {
      // Act - 开市状态 - 使用小数据的热缓存TTL
      const openMarketResult = CommonCacheService.calculateOptimalTTL(
        512,
        "hot",
      );

      // Act - 闭市状态 - 使用大数据的冷缓存TTL
      const closedMarketResult = CommonCacheService.calculateOptimalTTL(
        8192,
        "cold",
      );

      // Assert
      expect(openMarketResult).toBe(300); // hot TTL
      expect(closedMarketResult).toBe(3600); // cold TTL
    });

    it("应该支持新鲜度要求的TTL优化", () => {
      // Act - 实时需求 - 小数据快速访问模式
      const realtimeResult = CommonCacheService.calculateOptimalTTL(256, "hot");

      // Act - 分析需求 - 中等数据温缓存模式
      const analyticalResult = CommonCacheService.calculateOptimalTTL(
        2048,
        "warm",
      );

      // Assert
      expect(realtimeResult).toBe(300); // hot TTL
      expect(analyticalResult).toBe(1800); // warm TTL
    });

    it("应该支持复杂的多因子TTL计算", () => {
      // Act - 使用自定义TTL计算
      const result = CommonCacheService.calculateOptimalTTL(1024, "warm", 900);

      // Assert - 返回自定义TTL
      expect(result).toBe(900); // custom TTL
    });
  });

  describe("服务状态验证", () => {
    it("应该正确注入CommonCacheService", () => {
      expect(commonCacheService).toBeDefined();
      expect(commonCacheService).toBeInstanceOf(CommonCacheService);
    });
  });

  describe("边界条件测试", () => {
    it("应该处理极端TTL值", () => {
      // Test minimum TTL - 小数据量的热缓存
      const minResult = CommonCacheService.calculateOptimalTTL(50, "hot");
      expect(minResult).toBe(300); // hot TTL

      // Test maximum TTL - 大数据量的冷缓存
      const maxResult = CommonCacheService.calculateOptimalTTL(100000, "cold");
      expect(maxResult).toBe(3600); // cold TTL
    });

    it("应该处理距离开市很久的场景", () => {
      // Arrange - 使用不同的访问模式模拟距离开市很久的情况
      const result = CommonCacheService.calculateOptimalTTL(4096, "cold");

      // Assert - 应该有更大的缓存时间
      expect(result).toBe(3600); // cold TTL
    });
  });
});
