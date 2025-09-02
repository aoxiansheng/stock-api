/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Storage Metadata DTO UCK
 * KXCpnpn a
 */

import { StorageMetadataDto } from "../../../../../../../src/core/04-storage/storage/dto/storage-metadata.dto";
import { StorageClassification } from "../../../../../../../src/core/shared/types/storage-classification.enum";
import { StorageType } from "../../../../../../../src/core/04-storage/storage/enums/storage-type.enum";

describe("StorageMetadataDto", () => {
  describe("Constructor", () => {
    describe("Required Parameters", () => {
      it("should create instance with all required parameters", () => {
        // Arrange
        const key = "stock:00700.HK:quote";
        const storageType = StorageType.BOTH;
        const storageClassification = StorageClassification.STOCK_QUOTE;
        const provider = "longport";
        const market = "HK";
        const dataSize = 1024;
        const processingTimeMs = 150;

        // Act
        const dto = new StorageMetadataDto(
          key,
          storageType,
          storageClassification,
          provider,
          market,
          dataSize,
          processingTimeMs,
        );

        // Assert
        expect(dto).toBeInstanceOf(StorageMetadataDto);
        expect(dto.key).toBe(key);
        expect(dto.storageType).toBe(StorageType.BOTH);
        expect(dto.storageClassification).toBe(
          StorageClassification.STOCK_QUOTE,
        );
        expect(dto.provider).toBe(provider);
        expect(dto.market).toBe(market);
        expect(dto.dataSize).toBe(dataSize);
        expect(dto.processingTimeMs).toBe(processingTimeMs);
        expect(dto.storedAt).toBeDefined();
        expect(typeof dto.storedAt).toBe("string");
      });

      it("should auto-generate storedAt timestamp", () => {
        // Arrange
        const beforeTime = new Date().getTime();

        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "test_provider",
          "TEST",
          100,
          50,
        );

        const afterTime = new Date().getTime();
        const storedAtTime = new Date(dto.storedAt).getTime();

        // Assert
        expect(storedAtTime).toBeGreaterThanOrEqual(beforeTime);
        expect(storedAtTime).toBeLessThanOrEqual(afterTime);
        expect(dto.storedAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });
    });

    describe("Optional Parameters", () => {
      it("should create instance with all optional parameters", () => {
        // Arrange
        const compressed = true;
        const tags = { version: "1.0", source: "api" };
        const expiresAt = "2023-12-31T23:59:59.000Z";

        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.STOCK_CANDLE,
          "test_provider",
          "US",
          2048,
          200,
          compressed,
          tags,
          expiresAt,
        );

        // Assert
        expect(dto.compressed).toBe(true);
        expect(dto.tags).toEqual({ version: "1.0", source: "api" });
        expect(dto.expiresAt).toBe(expiresAt);
      });

      it("should handle undefined optional parameters", () => {
        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.PERSISTENT,
          StorageClassification.STOCK_BASIC_INFO,
          "provider",
          "CN",
          512,
          75,
        );

        // Assert
        expect(dto.compressed).toBeUndefined();
        expect(dto.tags).toBeUndefined();
        expect(dto.expiresAt).toBeUndefined();
      });

      it("should handle null optional parameters", () => {
        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.PERSISTENT,
          StorageClassification.MARKET_NEWS,
          "provider",
          "EU",
          256,
          100,
          undefined,
          undefined,
          undefined,
        );

        // Assert
        expect(dto.compressed).toBeUndefined();
        expect(dto.tags).toBeUndefined();
        expect(dto.expiresAt).toBeUndefined();
      });
    });
  });

  describe("Property Validation", () => {
    describe("Storage Types", () => {
      it("should handle all storage types", () => {
        // Arrange & Act & Assert
        const storageTypes = [
          StorageType.STORAGETYPECACHE,
          StorageType.PERSISTENT,
          StorageType.BOTH,
        ];

        storageTypes.forEach((storageType) => {
          const dto = new StorageMetadataDto(
            "test:key",
            storageType,
            StorageClassification.GENERAL,
            "provider",
            "TEST",
            100,
            50,
          );

          expect(dto.storageType).toBe(storageType);
        });
      });
    });

    describe("Storage Classifications", () => {
      it("should handle all storage classifications", () => {
        // Arrange
        const classifications = [
          StorageClassification.STOCK_QUOTE,
          StorageClassification.STOCK_CANDLE,
          StorageClassification.STOCK_TICK,
          StorageClassification.FINANCIAL_STATEMENT,
          StorageClassification.STOCK_BASIC_INFO,
          StorageClassification.MARKET_NEWS,
          StorageClassification.TRADING_ORDER,
          StorageClassification.USER_PORTFOLIO,
          StorageClassification.GENERAL,
        ];

        // Act & Assert
        classifications.forEach((classification) => {
          const dto = new StorageMetadataDto(
            "test:key",
            StorageType.STORAGETYPECACHE,
            classification,
            "provider",
            "TEST",
            100,
            50,
          );

          expect(dto.storageClassification).toBe(classification);
        });
      });
    });

    describe("Data Types and Formats", () => {
      it("should handle string fields correctly", () => {
        // Arrange
        const key = "complex:key:with:colons";
        const provider = "provider-with-dashes";
        const market = "MARKET_WITH_UNDERSCORES";

        // Act
        const dto = new StorageMetadataDto(
          key,
          StorageType.STORAGETYPECACHE,
          StorageClassification.STOCK_QUOTE,
          provider,
          market,
          1024,
          150,
        );

        // Assert
        expect(dto.key).toBe(key);
        expect(dto.provider).toBe(provider);
        expect(dto.market).toBe(market);
      });

      it("should handle numeric fields correctly", () => {
        // Arrange
        const testCases = [
          { dataSize: 0, processingTimeMs: 0 },
          { dataSize: 1, processingTimeMs: 1 },
          { dataSize: 1048576, processingTimeMs: 1000 }, // 1MB, 1s
          { dataSize: 104857600, processingTimeMs: 5000 }, // 100MB, 5s
        ];

        // Act & Assert
        testCases.forEach(({ dataSize, processingTimeMs }) => {
          const dto = new StorageMetadataDto(
            "test:key",
            StorageType.STORAGETYPECACHE,
            StorageClassification.GENERAL,
            "provider",
            "TEST",
            dataSize,
            processingTimeMs,
          );

          expect(dto.dataSize).toBe(dataSize);
          expect(dto.processingTimeMs).toBe(processingTimeMs);
        });
      });

      it("should handle boolean compression flag", () => {
        // Arrange & Act & Assert
        const compressedDto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "provider",
          "TEST",
          1024,
          100,
          true,
        );

        const uncompressedDto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "provider",
          "TEST",
          1024,
          100,
          false,
        );

        expect(compressedDto.compressed).toBe(true);
        expect(uncompressedDto.compressed).toBe(false);
      });
    });

    describe("Tags Handling", () => {
      it("should handle empty tags object", () => {
        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "provider",
          "TEST",
          100,
          50,
          false,
          {},
        );

        // Assert
        expect(dto.tags).toEqual({});
        expect(Object.keys(dto.tags)).toHaveLength(0);
      });

      it("should handle complex tags object", () => {
        // Arrange
        const tags = {
          version: "1.2.3",
          environment: "production",
          source: "api",
          priority: "high",
          "custom-tag": "custom-value",
        };

        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.BOTH,
          StorageClassification.STOCK_QUOTE,
          "provider",
          "HK",
          2048,
          200,
          true,
          tags,
        );

        // Assert
        expect(dto.tags).toEqual(tags);
        expect(dto.tags.version).toBe("1.2.3");
        expect(dto.tags.environment).toBe("production");
        expect(dto.tags["custom-tag"]).toBe("custom-value");
      });

      it("should handle special characters in tag values", () => {
        // Arrange
        const tags = {
          _unicode: "-�~",
          "special-chars": "!@#$%^&*()_+-=",
          "json-like": '{"nested": "value"}',
          _url: "https://example.com/path?param=value",
        };

        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "provider",
          "TEST",
          100,
          50,
          false,
          tags,
        );

        // Assert
        expect(dto.tags.unicode).toBe("-�~");
        expect(dto.tags["special-chars"]).toBe("!@#$%^&*()_+-=");
        expect(dto.tags["json-like"]).toBe('{"nested": "value"}');
        expect(dto.tags.url).toBe("https://example.com/path?param=value");
      });
    });

    describe("Timestamp Handling", () => {
      it("should handle expires at timestamp", () => {
        // Arrange
        const expiresAt = "2023-12-31T23:59:59.999Z";

        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "provider",
          "TEST",
          100,
          50,
          false,
          undefined,
          expiresAt,
        );

        // Assert
        expect(dto.expiresAt).toBe(expiresAt);
        expect(() => new Date(dto.expiresAt)).not.toThrow();
        expect(new Date(dto.expiresAt)).toBeInstanceOf(Date);
      });

      it("should validate timestamp format consistency", () => {
        // Act
        const dto = new StorageMetadataDto(
          "test:key",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "provider",
          "TEST",
          100,
          50,
        );

        // Assert
        expect(dto.storedAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
        expect(new Date(dto.storedAt).toISOString()).toBe(dto.storedAt);
      });
    });
  });

  describe("Real-world Usage Scenarios", () => {
    describe("Stock Data Storage", () => {
      it("should create metadata for HK stock quote", () => {
        // Act
        const dto = new StorageMetadataDto(
          "quote:00700.HK:longport",
          StorageType.BOTH,
          StorageClassification.STOCK_QUOTE,
          "longport",
          "HK",
          2048,
          156,
          true,
          {
            symbol: "00700.HK",
            company: "Tencent",
            source: "real-time",
          },
          new Date(Date.now() + 300000).toISOString(), // Expires in 5 minutes
        );

        // Assert
        expect(dto.key).toContain("00700.HK");
        expect(dto.storageClassification).toBe(
          StorageClassification.STOCK_QUOTE,
        );
        expect(dto.market).toBe("HK");
        expect(dto.compressed).toBe(true);
        expect(dto.tags.symbol).toBe("00700.HK");
        expect(dto.expiresAt).toBeDefined();
      });

      it("should create metadata for US stock data", () => {
        // Act
        const dto = new StorageMetadataDto(
          "_candle:AAPL.US:1d:longport",
          StorageType.PERSISTENT,
          StorageClassification.STOCK_CANDLE,
          "longport",
          "US",
          15360,
          245,
          true,
          {
            symbol: "AAPL.US",
            _interval: "1d",
            count: "100",
          },
        );

        // Assert
        expect(dto.key).toContain("AAPL.US");
        expect(dto.storageType).toBe(StorageType.PERSISTENT);
        expect(dto.storageClassification).toBe(
          StorageClassification.STOCK_CANDLE,
        );
        expect(dto.market).toBe("US");
        expect(dto.tags.interval).toBe("1d");
        expect(dto.expiresAt).toBeUndefined(); // Persistent data doesn't expire
      });
    });

    describe("Market Data Storage", () => {
      it("should create metadata for market news", () => {
        // Act
        const dto = new StorageMetadataDto(
          "news:market:_global:20230601",
          StorageType.STORAGETYPECACHE,
          StorageClassification.MARKET_NEWS,
          "news_provider",
          "GLOBAL",
          8192,
          89,
          false,
          {
            _category: "market_update",
            language: "en",
            priority: "high",
          },
          new Date(Date.now() + 3600000).toISOString(), // Expires in 1 hour
        );

        // Assert
        expect(dto.storageClassification).toBe(
          StorageClassification.MARKET_NEWS,
        );
        expect(dto.storageType).toBe(StorageType.STORAGETYPECACHE);
        expect(dto.market).toBe("GLOBAL");
        expect(dto.compressed).toBe(false);
        expect(dto.tags.category).toBe("market_update");
      });

      it("should create metadata for financial statements", () => {
        // Act
        const dto = new StorageMetadataDto(
          "financial:00700.HK:2023Q1",
          StorageType.PERSISTENT,
          StorageClassification.FINANCIAL_STATEMENT,
          "financial_data_provider",
          "HK",
          51200,
          1200,
          true,
          {
            company: "00700.HK",
            _period: "2023Q1",
            currency: "HKD",
            audited: "true",
          },
        );

        // Assert
        expect(dto.storageClassification).toBe(
          StorageClassification.FINANCIAL_STATEMENT,
        );
        expect(dto.storageType).toBe(StorageType.PERSISTENT);
        expect(dto.dataSize).toBe(51200);
        expect(dto.processingTimeMs).toBe(1200);
        expect(dto.tags.period).toBe("2023Q1");
      });
    });

    describe("Performance Characteristics", () => {
      it("should handle large data with appropriate processing time", () => {
        // Act
        const dto = new StorageMetadataDto(
          "_bulk:tick_data:20230601",
          StorageType.PERSISTENT,
          StorageClassification.STOCK_TICK,
          "tick_provider",
          "ALL",
          104857600, // 100MB
          5000, // 5 seconds
          true,
          {
            date: "2023-06-01",
            symbols_count: "1000",
            records_count: "1000000",
          },
        );

        // Assert
        expect(dto.dataSize).toBe(104857600);
        expect(dto.processingTimeMs).toBe(5000);
        expect(dto.compressed).toBe(true);
        expect(dto.tags.records_count).toBe("1000000");
      });

      it("should handle small data with fast processing", () => {
        // Act
        const dto = new StorageMetadataDto(
          "_simple:_config:app_settings",
          StorageType.STORAGETYPECACHE,
          StorageClassification.GENERAL,
          "config_provider",
          "APP",
          256,
          5,
          false,
          {
            type: "configuration",
            version: "1.0",
          },
          new Date(Date.now() + 86400000).toISOString(), // Expires in 24 hours
        );

        // Assert
        expect(dto.dataSize).toBe(256);
        expect(dto.processingTimeMs).toBe(5);
        expect(dto.compressed).toBe(false);
        expect(dto.tags.type).toBe("configuration");
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle very long keys", () => {
      // Arrange
      const longKey = "very:long:key:with:many:segments:".repeat(10);

      // Act
      const dto = new StorageMetadataDto(
        longKey,
        StorageType.STORAGETYPECACHE,
        StorageClassification.GENERAL,
        "provider",
        "TEST",
        100,
        50,
      );

      // Assert
      expect(dto.key).toBe(longKey);
      expect(dto.key.length).toBeGreaterThan(100);
    });

    it("should handle extreme numeric values", () => {
      // Act
      const dto = new StorageMetadataDto(
        "test:extreme",
        StorageType.PERSISTENT,
        StorageClassification.GENERAL,
        "provider",
        "TEST",
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
      );

      // Assert
      expect(dto.dataSize).toBe(Number.MAX_SAFE_INTEGER);
      expect(dto.processingTimeMs).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle special characters in provider and market", () => {
      // Act
      const dto = new StorageMetadataDto(
        "test:special",
        StorageType.STORAGETYPECACHE,
        StorageClassification.GENERAL,
        "provider-with-special-chars_123",
        "MARKET_CODE-2023",
        1024,
        100,
      );

      // Assert
      expect(dto.provider).toBe("provider-with-special-chars_123");
      expect(dto.market).toBe("MARKET_CODE-2023");
    });

    it("should maintain immutability of enum values", () => {
      // Act
      const dto = new StorageMetadataDto(
        "test:immutable",
        StorageType.BOTH,
        StorageClassification.STOCK_QUOTE,
        "provider",
        "TEST",
        100,
        50,
      );

      // Assert
      expect(dto.storageType).toBe("both");
      expect(dto.storageClassification).toBe("stock_quote");
      expect(Object.isFrozen(StorageType)).toBe(false); // Enums are not frozen by default
      expect(Object.isFrozen(StorageClassification)).toBe(false);
    });
  });

  describe("Integration and Serialization", () => {
    it("should serialize and deserialize correctly", () => {
      // Arrange
      const original = new StorageMetadataDto(
        "serialize:test",
        StorageType.BOTH,
        StorageClassification.STOCK_QUOTE,
        "provider",
        "HK",
        2048,
        150,
        true,
        { test: "value" },
        "2023-12-31T23:59:59.000Z",
      );

      // Act
      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized);

      // Assert
      expect(deserialized.key).toBe(original.key);
      expect(deserialized.storageType).toBe(original.storageType);
      expect(deserialized.storageClassification).toBe(
        original.storageClassification,
      );
      expect(deserialized.provider).toBe(original.provider);
      expect(deserialized.market).toBe(original.market);
      expect(deserialized.dataSize).toBe(original.dataSize);
      expect(deserialized.processingTimeMs).toBe(original.processingTimeMs);
      expect(deserialized.compressed).toBe(original.compressed);
      expect(deserialized.tags).toEqual(original.tags);
      expect(deserialized.expiresAt).toBe(original.expiresAt);
    });

    it("should work with Object.assign for partial updates", () => {
      // Arrange
      const dto = new StorageMetadataDto(
        "update:test",
        StorageType.STORAGETYPECACHE,
        StorageClassification.GENERAL,
        "provider",
        "TEST",
        100,
        50,
      );

      const updates = {
        dataSize: 200,
        compressed: true,
        tags: { updated: "true" },
      };

      // Act
      Object.assign(dto, updates);

      // Assert
      expect(dto.dataSize).toBe(200);
      expect(dto.compressed).toBe(true);
      expect(dto.tags).toEqual({ updated: "true" });
      expect(dto.key).toBe("update:test"); // Original values preserved
      expect(dto.storageType).toBe(StorageType.STORAGETYPECACHE);
    });
  });
});
