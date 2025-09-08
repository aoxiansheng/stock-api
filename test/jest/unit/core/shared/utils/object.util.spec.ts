import { ObjectUtils } from "@core/shared/utils/object.util";
import { TestUtils } from "../../../../shared/test-utils";
import { REFERENCE_DATA } from '@common/constants/domain';

describe("ObjectUtils", () => {
  describe("getValueFromPath", () => {
    describe("基础功能测试", () => {
      it("should extract simple property values", () => {
        const obj = { name: "test", age: 25, active: true };

        expect(ObjectUtils.getValueFromPath(obj, "name")).toBe("test");
        expect(ObjectUtils.getValueFromPath(obj, "age")).toBe(25);
        expect(ObjectUtils.getValueFromPath(obj, "active")).toBe(true);
      });

      it("should extract nested object values using dot notation", () => {
        const obj = {
          user: {
            profile: {
              name: "John Doe",
              details: {
                email: "john@example.com",
              },
            },
          },
        };

        expect(ObjectUtils.getValueFromPath(obj, "user.profile.name")).toBe(
          "John Doe",
        );
        expect(
          ObjectUtils.getValueFromPath(obj, "user.profile.details.email"),
        ).toBe("john@example.com");
      });

      it("should extract array values using bracket notation", () => {
        const obj = {
          items: ["item1", "item2", "item3"],
          nested: {
            list: [{ id: 1 }, { id: 2 }],
          },
        };

        expect(ObjectUtils.getValueFromPath(obj, "items[0]")).toBe("item1");
        expect(ObjectUtils.getValueFromPath(obj, "items[2]")).toBe("item3");
        expect(ObjectUtils.getValueFromPath(obj, "nested.list[1].id")).toBe(2);
      });

      it("should handle mixed dot and bracket notation", () => {
        const obj = {
          data: {
            records: [
              { name: "Record 1", values: [10, 20, 30] },
              { name: "Record 2", values: [40, 50, 60] },
            ],
          },
        };

        expect(ObjectUtils.getValueFromPath(obj, "data.records[0].name")).toBe(
          "Record 1",
        );
        expect(
          ObjectUtils.getValueFromPath(obj, "data.records[1].values[2]"),
        ).toBe(60);
      });
    });

    describe("边界条件测试", () => {
      it("should return undefined for null or undefined objects", () => {
        expect(ObjectUtils.getValueFromPath(null, "any.path")).toBeUndefined();
        expect(
          ObjectUtils.getValueFromPath(undefined, "any.path"),
        ).toBeUndefined();
      });

      it("should return undefined for empty or invalid paths", () => {
        const obj = { test: "value" };

        expect(ObjectUtils.getValueFromPath(obj, "")).toBeUndefined();
        expect(ObjectUtils.getValueFromPath(obj, null as any)).toBeUndefined();
        expect(
          ObjectUtils.getValueFromPath(obj, undefined as any),
        ).toBeUndefined();
      });

      it("should return undefined for non-existent paths", () => {
        const obj = { user: { name: "test" } };

        expect(ObjectUtils.getValueFromPath(obj, "user.email")).toBeUndefined();
        expect(
          ObjectUtils.getValueFromPath(obj, "profile.name"),
        ).toBeUndefined();
        expect(
          ObjectUtils.getValueFromPath(obj, "user.name.length"),
        ).toBeUndefined();
      });

      it("should handle array index out of bounds", () => {
        const obj = { items: ["a", "b", "c"] };

        expect(ObjectUtils.getValueFromPath(obj, "items[10]")).toBeUndefined();
        expect(ObjectUtils.getValueFromPath(obj, "items[-1]")).toBeUndefined();
      });

      it("should handle empty objects and arrays", () => {
        expect(ObjectUtils.getValueFromPath({}, "any.path")).toBeUndefined();
        expect(
          ObjectUtils.getValueFromPath({ items: [] }, "items[0]"),
        ).toBeUndefined();
      });

      it("should handle primitive values in path", () => {
        const obj = { value: "string" };

        expect(
          ObjectUtils.getValueFromPath(obj, "value.length"),
        ).toBeUndefined();
        expect(ObjectUtils.getValueFromPath(obj, "value[0]")).toBeUndefined();
      });
    });

    describe("高级特性测试", () => {
      it("should handle camelCase fallback matching", () => {
        const obj = {
          firstName: "John",
          "last-name": "Doe",
          user_email: "john@example.com",
        };

        // The current implementation converts underscore/hyphen+letter to camelCase
        // So 'first_name' gets converted to 'firstName' and matches
        expect(ObjectUtils.getValueFromPath(obj, "first_name")).toBe("John");
        // 'last_name' gets converted to 'lastName' but we have 'last-name', so no match
        expect(ObjectUtils.getValueFromPath(obj, "last_name")).toBeUndefined();
        // 'user_email' gets converted to 'userEmail' but we have 'user_email', so direct match
        expect(ObjectUtils.getValueFromPath(obj, "user_email")).toBe(
          "john@example.com",
        );

        // Exact matches should work
        expect(ObjectUtils.getValueFromPath(obj, "firstName")).toBe("John");
        expect(ObjectUtils.getValueFromPath(obj, "last-name")).toBe("Doe");
      });

      it("should prioritize exact matches over camelCase matches", () => {
        const obj = {
          userName: "exact",
          user_name: "camelCase",
        };

        // Exact match should take precedence
        expect(ObjectUtils.getValueFromPath(obj, "userName")).toBe("exact");
        expect(ObjectUtils.getValueFromPath(obj, "user_name")).toBe(
          "camelCase",
        );
      });

      it("should handle complex nested structures", () => {
        const obj = {
          api: {
            response: {
              data: [
                {
                  stock_quote: [
                    { symbol: "AAPL", last_done: 150.25 },
                    { symbol: "GOOGL", last_done: 2800.5 },
                  ],
                },
              ],
            },
          },
        };

        expect(
          ObjectUtils.getValueFromPath(
            obj,
            "api.response.data[0].stock_quote[1].symbol",
          ),
        ).toBe("GOOGL");
        // The camelCase conversion will try to convert 'stockQuote' but we have 'stock_quote'
        // and 'lastDone' but we have 'last_done', so let's test the actual behavior
        expect(
          ObjectUtils.getValueFromPath(
            obj,
            "api.response.data[0].stock_quote[0].last_done",
          ),
        ).toBe(150.25);
      });

      it("should handle maximum nested depth limit", () => {
        // Create an object with 12 levels of nesting (exceeds MAX_NESTED_DEPTH = 10)
        const createDeepObject = (depth: number): any => {
          if (depth === 0) return { value: "deep" };
          return { level: createDeepObject(depth - 1) };
        };

        const deepObj = createDeepObject(12);
        const deepPath = Array(12).fill("level").join(".") + ".value";

        // Should return undefined due to depth limit
        expect(ObjectUtils.getValueFromPath(deepObj, deepPath)).toBeUndefined();
      });

      it("should handle special characters in property names", () => {
        const obj = {
          "with-dashes": "dash-value",
          with_underscores: "underscore-value",
          "with spaces": "space-value",
          "with.dots": "dot-value",
        };

        expect(ObjectUtils.getValueFromPath(obj, "with-dashes")).toBe(
          "dash-value",
        );
        expect(ObjectUtils.getValueFromPath(obj, "with_underscores")).toBe(
          "underscore-value",
        );
        expect(ObjectUtils.getValueFromPath(obj, "with spaces")).toBe(
          "space-value",
        );
      });
    });

    describe("数据类型测试", () => {
      it("should handle all JavaScript data types", () => {
        const obj = {
          string: "text",
          number: 42,
          boolean: true,
          null: null,
          undefined: undefined,
          array: [1, 2, 3],
          object: { nested: true },
          date: new Date("2023-01-01"),
          regexp: /test/g,
          function: () => "function result",
        };

        expect(ObjectUtils.getValueFromPath(obj, "string")).toBe("text");
        expect(ObjectUtils.getValueFromPath(obj, "number")).toBe(42);
        expect(ObjectUtils.getValueFromPath(obj, "boolean")).toBe(true);
        expect(ObjectUtils.getValueFromPath(obj, "null")).toBeNull();
        expect(ObjectUtils.getValueFromPath(obj, "undefined")).toBeUndefined();
        expect(ObjectUtils.getValueFromPath(obj, "array[1]")).toBe(2);
        expect(ObjectUtils.getValueFromPath(obj, "object.nested")).toBe(true);
        expect(ObjectUtils.getValueFromPath(obj, "date")).toBeInstanceOf(Date);
        expect(ObjectUtils.getValueFromPath(obj, "regexp")).toBeInstanceOf(
          RegExp,
        );
        expect(ObjectUtils.getValueFromPath(obj, "function")).toBeInstanceOf(
          Function,
        );
      });

      it("should handle zero and falsy values correctly", () => {
        const obj = {
          zero: 0,
          emptyString: "",
          false: false,
          emptyArray: [],
          emptyObject: {},
        };

        expect(ObjectUtils.getValueFromPath(obj, "zero")).toBe(0);
        expect(ObjectUtils.getValueFromPath(obj, "emptyString")).toBe("");
        expect(ObjectUtils.getValueFromPath(obj, "false")).toBe(false);
        expect(ObjectUtils.getValueFromPath(obj, "emptyArray")).toEqual([]);
        expect(ObjectUtils.getValueFromPath(obj, "emptyObject")).toEqual({});
      });
    });

    describe("性能测试", () => {
      it("should handle small objects efficiently", async () => {
        const obj = TestUtils.createTestObject(50); // 50 properties
        const path = "level1.level2.level3.value";

        const benchmark = TestUtils.createPerformanceBenchmark(
          "getValueFromPath-small",
          (global as any).testConfig.PERFORMANCE_THRESHOLDS.OBJECT_TRAVERSE,
        );

        const result = await benchmark.run(async () => {
          return ObjectUtils.getValueFromPath(obj, path);
        });

        expect(result).toBeDefined();
      });

      it("should handle large objects within reasonable time", async () => {
        // Create a complex object with multiple levels and arrays
        const createLargeObject = () => {
          const obj: any = {};
          for (let i = 0; i < 1000; i++) {
            obj[`prop${i}`] = {
              id: i,
              data: Array.from({ length: 10 }, (_, j) => ({
                index: j,
                value: `value-${i}-${j}`,
              })),
            };
          }
          return obj;
        };

        const largeObj = createLargeObject();
        const path = "prop500.data[5].value";

        const { result, duration } = await TestUtils.measureExecutionTime(
          async () => {
            return ObjectUtils.getValueFromPath(largeObj, path);
          },
        );

        expect(result).toBe("value-500-5");
        expect(duration).toBeLessThan(50); // Should complete within 50ms
      });

      it("should handle deep nesting efficiently", async () => {
        // Create an object with maximum allowed depth
        const createDeepObject = (depth: number): any => {
          if (depth === 0) return { value: "reached-bottom" };
          return { [`level${depth}`]: createDeepObject(depth - 1) };
        };

        const deepObj = createDeepObject(9); // Just under the limit
        const path =
          Array.from({ length: 9 }, (_, i) => `level${9 - i}`).join(".") +
          ".value";

        const { result, duration } = await TestUtils.measureExecutionTime(
          async () => {
            return ObjectUtils.getValueFromPath(deepObj, path);
          },
        );

        expect(result).toBe("reached-bottom");
        expect(duration).toBeLessThan(20); // Should be fast for allowed depth
      });

      it("should handle repeated access efficiently", async () => {
        const obj = TestUtils.createTestObject(100);
        const paths = [
          "level1.level2.level3.value",
          "array[0].id",
          "array[5].nested.name",
          "metadata.timestamp",
        ];

        const { duration } = await TestUtils.measureExecutionTime(async () => {
          for (let i = 0; i < 1000; i++) {
            for (const path of paths) {
              ObjectUtils.getValueFromPath(obj, path);
            }
          }
        });

        // 1000 iterations * 4 paths = 4000 operations should complete quickly
        expect(duration).toBeLessThan(100); // Should complete within 100ms
      });
    });

    describe("实际使用场景测试", () => {
      it("should work with API response structures", () => {
        const apiResponse = {
          status: 200,
          message: "成功",
          data: {
            quotes: [
              {
                symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
                last_done: 350.2,
                volume: 1000000,
                market_info: {
                  exchange: "HKEX",
                  currency: "HKD",
                },
              },
              {
                symbol: "AAPL.US",
                last_done: 150.5,
                volume: 2000000,
                market_info: {
                  exchange: "NASDAQ",
                  currency: "USD",
                },
              },
            ],
          },
        };

        expect(
          ObjectUtils.getValueFromPath(apiResponse, "data.quotes[0].symbol"),
        ).toBe(REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT);
        expect(
          ObjectUtils.getValueFromPath(apiResponse, "data.quotes[1].last_done"),
        ).toBe(150.5);
        expect(
          ObjectUtils.getValueFromPath(
            apiResponse,
            "data.quotes[0].market_info.exchange",
          ),
        ).toBe("HKEX");
      });

      it("should work with configuration objects", () => {
        const config = {
          database: {
            mongodb: {
              connection_string: "mongodb://localhost:27017",
              options: {
                max_pool_size: 10,
                server_selection_timeout_ms: 5000,
              },
            },
            redis: {
              host: "localhost",
              port: 6379,
              retry_policy: {
                max_retries: 3,
                backoff_ms: 1000,
              },
            },
          },
        };

        expect(
          ObjectUtils.getValueFromPath(
            config,
            "database.mongodb.connection_string",
          ),
        ).toBe("mongodb://localhost:27017");
        expect(
          ObjectUtils.getValueFromPath(
            config,
            "database.mongodb.options.max_pool_size",
          ),
        ).toBe(10);
        expect(
          ObjectUtils.getValueFromPath(
            config,
            "database.redis.retry_policy.max_retries",
          ),
        ).toBe(3);
      });

      it("should handle provider data transformation scenarios", () => {
        const providerData = {
          secu_quote: [
            {
              symbol: "00700",
              last_done: 350.2,
              prev_close: 348.5,
              volume: 1234567,
              market_status: "TRADING",
            },
          ],
          basic_info: {
            company_name: "Tencent Holdings Ltd",
            industry: "Technology",
            market_cap: 3500000000000,
          },
        };

        // Test field mapping paths used in data transformation
        expect(
          ObjectUtils.getValueFromPath(providerData, "secu_quote[0].last_done"),
        ).toBe(350.2);
        // The camelCase conversion doesn't work in reverse, so these tests need to use exact paths
        expect(
          ObjectUtils.getValueFromPath(providerData, "basic_info.company_name"),
        ).toBe("Tencent Holdings Ltd");

        // Test the camelCase conversion that DOES work (underscore+letter to camelCase)
        const camelCaseData = {
          secuQuote: [{ lastDone: 350.2 }],
          basicInfo: { companyName: "Tencent Holdings Ltd" },
        };
        expect(
          ObjectUtils.getValueFromPath(
            camelCaseData,
            "secu_quote[0].last_done",
          ),
        ).toBe(350.2);
        expect(
          ObjectUtils.getValueFromPath(
            camelCaseData,
            "basic_info.company_name",
          ),
        ).toBe("Tencent Holdings Ltd");
      });
    });

    describe("错误处理测试", () => {
      it("should handle circular references gracefully", () => {
        const obj: any = { name: "test" };
        obj.self = obj; // Create circular reference

        // Should not throw an error, just return undefined for deep paths
        expect(() =>
          ObjectUtils.getValueFromPath(obj, "self.self.self.name"),
        ).not.toThrow();
        expect(ObjectUtils.getValueFromPath(obj, "self.name")).toBe("test");
      });

      it("should handle malformed paths gracefully", () => {
        const obj = { test: { value: 42 } };

        // These malformed paths should not crash
        expect(() => ObjectUtils.getValueFromPath(obj, ".....")).not.toThrow();
        expect(() => ObjectUtils.getValueFromPath(obj, "[[[]]")).not.toThrow();
        expect(() =>
          ObjectUtils.getValueFromPath(obj, "test..value"),
        ).not.toThrow();

        // Paths that result in empty keys after filtering return the original object
        expect(ObjectUtils.getValueFromPath(obj, ".....")).toBe(obj);
        expect(ObjectUtils.getValueFromPath(obj, "[[[]]")).toBe(obj);
      });

      it("should handle non-string paths gracefully", () => {
        const obj = { test: "value" };

        // Non-string paths should be handled gracefully and return undefined
        // These will log errors but should not crash
        expect(ObjectUtils.getValueFromPath(obj, 123 as any)).toBeUndefined();
        expect(ObjectUtils.getValueFromPath(obj, {} as any)).toBeUndefined();
        expect(ObjectUtils.getValueFromPath(obj, [] as any)).toBeUndefined();
      });

      it("should handle prototype pollution attempts", () => {
        const obj = { test: "value" };

        // These paths should not allow prototype pollution
        expect(
          ObjectUtils.getValueFromPath(obj, "__proto__.polluted"),
        ).toBeUndefined();
        expect(
          ObjectUtils.getValueFromPath(obj, "constructor.prototype.polluted"),
        ).toBeUndefined();
      });
    });
  });
});
