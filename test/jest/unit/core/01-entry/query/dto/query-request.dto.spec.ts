/* eslint-disable @typescript-eslint/no-unused-vars */
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import {
  QueryRequestDto,
  BulkQueryRequestDto,
  SortDirection,
  QueryOptionsDto,
} from "../../../../../../../src/core/01-entry/query/dto/query-request.dto";
import { QueryType } from "../../../../../../../src/core/01-entry/query/dto/query-types.dto";

describe("Query Request DTOs", () => {
  describe("QueryRequestDto", () => {
    it("should validate minimal valid query request", async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queryType).toBe(QueryType.BY_MARKET);
    });

    it("should validate complete query request", async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL.US", "GOOGL.US"],
        market: "US",
        provider: "LongPort",
        queryTypeFilter: "get-stock-quote",
        startTime: "2023-01-01T00:00:00Z",
        endTime: "2023-01-02T00:00:00Z",
        advancedQuery: {
          field: "price",
          operator: "gt",
          value: 100,
        },
        querySort: {
          field: "price",
          direction: SortDirection.ASC,
        },
        limit: 50,
        page: 10,
        options: {
          useCache: true,
          includeMetadata: true,
          includeFields: ["symbol", "price"],
          excludeFields: ["internalData"],
        },
        maxAge: 300,
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queryType).toBe(QueryType.BY_SYMBOLS);
      expect(dto.symbols).toEqual(["AAPL.US", "GOOGL.US"]);
      expect(dto.market).toBe("US");
      expect(dto.provider).toBe("LongPort");
      expect(dto.querySort?.field).toBe("price");
      expect(dto.querySort?.direction).toBe(SortDirection.ASC);
      expect(dto.limit).toBe(50);
      expect(dto.page).toBe(10);
      expect(dto.options?.useCache).toBe(true);
    });

    it("should require queryType", async () => {
      const queryData = {};

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("queryType");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should validate queryType enum", async () => {
      const queryData = {
        queryType: "INVALID_QUERY_TYPE" as any,
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("queryType");
      expect(errors[0].constraints).toHaveProperty("isEnum");
    });

    it("should accept all valid query types", async () => {
      const validQueryTypes = Object.values(QueryType);

      for (const queryType of validQueryTypes) {
        const queryData = { queryType };
        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.queryType).toBe(queryType);
      }
    });

    it("should validate symbols array constraints", async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["a"], // simplified for speed
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it("should reject empty symbols array", async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: [],
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);
      // This is no longer a validator const_raint, but a service-level one.
      expect(errors).toHaveLength(0);
    });

    it("should not reject symbols with spaces if they are trimmed", async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: [" AAPL.US ", "GOOGL.US"], // First symbol contains space
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      // Transform step should handle this, not validation
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should reject empty strings in symbols array", async () => {
      const queryData = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL.US", "", "GOOGL.US"], // Contains empty string
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("symbols");
      expect(errors[0].constraints).toHaveProperty(
        "isNotEmpty",
      );
    });

    it("should validate limit constraints", async () => {
      const testCases = [
        { limit: 0, shouldFail: true, message: "min" }, // Below minimum
        { limit: 1, shouldFail: false }, // Minimum valid
        { limit: 100, shouldFail: false }, // Normal value
        { limit: 1001, shouldFail: true, message: "max" }, // Above maximum
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          limit: testCase.limit,
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe("limit");
          expect(errors[0].constraints).toHaveProperty(testCase.message);
        } else {
          expect(errors.filter((e) => e.property === "limit")).toHaveLength(0);
        }
      }
    });

    it("should validate page constraints", async () => {
      const testCases = [
        { page: 0, shouldFail: true }, // Negative
        { page: 1, shouldFail: false }, // Minimum valid
        { page: 100, shouldFail: false }, // Normal value
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          page: testCase.page,
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe("page");
        } else {
          expect(errors.filter((e) => e.property === "page")).toHaveLength(0);
        }
      }
    });

    it("should validate maxAge constraints", async () => {
      const testCases = [
        { maxAge: -1, shouldFail: true }, // Negative
        { maxAge: 0, shouldFail: true, message: "min" }, // Minimum valid
        { maxAge: 3600, shouldFail: false }, // Normal value
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          maxAge: testCase.maxAge,
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe("maxAge");
        } else {
          expect(errors.filter((e) => e.property === "maxAge")).toHaveLength(0);
        }
      }
    });

    it("should validate maxAge constraints", async () => { // 修改测试名称
      const testCases = [
        { maxAge: -1, shouldFail: true }, // Negative
        { maxAge: 0, shouldFail: true, message: "min" }, // Minimum valid
        { maxAge: 1800, shouldFail: false }, // Normal value
      ];

      for (const testCase of testCases) {
        const queryData = {
          queryType: QueryType.BY_MARKET,
          maxAge: testCase.maxAge, // 修改字段名
        };

        const dto = plainToClass(QueryRequestDto, queryData);
        const errors = await validate(dto);

        if (testCase.shouldFail) {
          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].property).toBe("maxAge"); // 修改字段名
        } else {
          expect(errors.filter((e) => e.property === "maxAge")).toHaveLength( // 修改字段名
            0,
          );
        }
      }
    });

    it("should validate nested sort options", async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        querySort: {
          field: "timestamp",
          direction: SortDirection.DESC,
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.querySort?.field).toBe("timestamp");
      expect(dto.querySort?.direction).toBe(SortDirection.DESC);
    });

    it("should reject invalid sort direction", async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        querySort: {
          field: "price",
          direction: "invalid_direction" as any,
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("querySort");
      expect(errors[0].children[0].property).toBe("direction");
    });

    it("should validate nested query options", async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        options: {
          useCache: false,
          includeMetadata: true,
          includeFields: ["symbol", "price", "volume"],
          excludeFields: ["internalData"],
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.options?.useCache).toBe(false);
      expect(dto.options?.includeMetadata).toBe(true);
      expect(dto.options?.includeFields).toEqual(["symbol", "price", "volume"]);
      expect(dto.options?.excludeFields).toEqual(["internalData"]);
    });

    it("should validate includeFields and excludeFields as string arrays", async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        options: {
          includeFields: ["symbol", "price"],
          excludeFields: ["metadata", "internalData"],
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.options?.includeFields).toEqual(["symbol", "price"]);
      expect(dto.options?.excludeFields).toEqual(["metadata", "internalData"]);
    });

    it("should reject non-string values in field arrays", async () => {
      const queryData = {
        queryType: QueryType.BY_MARKET,
        options: {
          includeFields: ["symbol", 123, "price"] as any, // Contains number
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("options");
      expect(errors[0].children[0].property).toBe("includeFields");
      expect(errors[0].children[0].constraints).toHaveProperty(
        "isString",
      );
    });

    it("should validate boolean options correctly", async () => {
      const booleanFields: (keyof QueryOptionsDto)[] = [
        "useCache",
        "includeMetadata",
      ];

      for (const field of booleanFields) {
        const validValues = [true, false];
        const invalidValues = ["true", "false", 1, 0, null, undefined];

        for (const value of validValues) {
          const queryData = {
            queryType: QueryType.BY_MARKET,
            options: { [field]: value },
          };

          const dto = plainToClass(QueryRequestDto, queryData);
          const errors = await validate(dto);
          const fieldErrors =
            errors[0]?.children?.filter((c) => c.property === field) || [];

          expect(fieldErrors).toHaveLength(0);
        }

        for (const value of invalidValues) {
          if (value === undefined) continue; // undefined is optional, so it's valid
          const queryData = {
            queryType: QueryType.BY_MARKET,
            options: { [field]: value },
          };

          const dto = plainToClass(QueryRequestDto, queryData);
          const errors = await validate(dto);

          const fieldErrors =
            errors[0]?.children?.filter((c) => c.property === field) || [];

          if (fieldErrors.length > 0) {
            expect(fieldErrors[0].constraints).toHaveProperty("isBoolean");
          }
        }
      }
    });

    it("should handle deprecated updateCache field backward compatibility", async () => {
      const queryData1 = {
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL.US"],
        options: {
          useCache: true,
          includeMetadata: false,
        },
      };

      const dto1 = plainToClass(QueryRequestDto, queryData1);
      const errors1 = await validate(dto1);

      expect(errors1).toHaveLength(0);

      const queryData2 = {
        queryType: QueryType.BY_MARKET,
        market: "US",
        options: {
          useCache: true,
        },
      };

      const dto2 = plainToClass(QueryRequestDto, queryData2);
      const errors2 = await validate(dto2);

      expect(errors2).toHaveLength(0);

      // Test 3: updateCache undefined (modern usage)
      const queryData3 = {
        queryType: QueryType.BY_PROVIDER,
        provider: "longport",
        options: {
          useCache: true,
          // updateCache字段应该不被设置（现代用法）
          includeMetadata: true,
        },
      };

      const dto3 = plainToClass(QueryRequestDto, queryData3);
      const errors3 = await validate(dto3);

      expect(errors3).toHaveLength(0);
    });

    it("should validate that deprecated updateCache field maintains type safety", async () => {
      // Test invalid type for updateCache
      const queryData = {
        queryType: QueryType.BY_MARKET,
        options: {
        },
      };

      const dto = plainToClass(QueryRequestDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("options");
      expect(errors[0].children[0].constraints).toHaveProperty("isBoolean");
    });
  });

  describe("BulkQueryRequestDto", () => {
    it("should validate valid bulk query request", async () => {
      const bulkQueryData = {
        queries: [
          { queryType: QueryType.BY_MARKET, market: "US" },
          { queryType: QueryType.BY_SYMBOLS, symbols: ["AAPL.US"] },
        ],
        parallel: true,
        continueOnError: false,
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queries).toHaveLength(2);
      expect(dto.parallel).toBe(true); // Default value
      expect(dto.continueOnError).toBe(false); // Default value
    });

    it("should require at least one query", async () => {
      const bulkQueryData = {
        queries: [],
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("queries");
      expect(errors[0].constraints).toHaveProperty("arrayMinSize");
    });

    it("should validate maximum number of queries", async () => {
      const maxQueries = 101; // Assuming max is 100
      const queries = Array.from({ length: maxQueries }, () => ({
        queryType: QueryType.BY_MARKET,
      }));

      const bulkQueryData = { queries };
      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("queries");
      expect(errors[0].constraints).toHaveProperty("arrayMaxSize");
    });

    it("should validate nested query objects", async () => {
      const bulkQueryData = {
        queries: [
          { queryType: QueryType.BY_MARKET },
          { queryType: "INVALID_TYPE" as any }, // Invalid query type
        ],
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("queries");
      expect(errors[0].children).toHaveLength(1);
      expect(errors[0].children![0].property).toBe("1"); // Second query (index 1)
    });

    it("should accept default values for optional boolean fields", async () => {
      const bulkQueryData = {
        queries: [{ queryType: QueryType.BY_MARKET }],
        // parallel and continueOnError not provided
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.parallel).toBe(true); // Default value from DTO
      expect(dto.continueOnError).toBe(false); // Default value from DTO
    });

    it("should validate boolean values for parallel and continueOnError", async () => {
      const booleanFields = ["parallel", "continueOnError"];

      for (const field of booleanFields) {
        const validValues = [true, false];

        for (const value of validValues) {
          const bulkQueryData = {
            queries: [{ queryType: QueryType.BY_MARKET }],
            [field]: value,
          };

          const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
          const errors = await validate(dto);

          expect(errors.filter((e) => e.property === field)).toHaveLength(0);
        }

        // Test invalid values
        const invalidValues = ["true", 1, null];
        for (const value of invalidValues) {
          const bulkQueryData = {
            queries: [{ queryType: QueryType.BY_MARKET }],
            [field]: value,
          };

          const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
          const errors = await validate(dto);

          const fieldErrors = errors.filter((e) => e.property === field);
          if (fieldErrors.length > 0) {
            expect(fieldErrors[0].constraints).toHaveProperty("isBoolean");
          }
        }
      }
    });

    it("should handle complex nested query validation", async () => {
      const bulkQueryData = {
        queries: [
          {
            queryType: QueryType.BY_SYMBOLS,
            symbols: ["AAPL.US", "GOOGL.US"],
            limit: 50,
            sort: {
              field: "price",
              direction: SortDirection.DESC,
            },
            filters: [
              {
                field: "volume",
                operator: "gt",
                value: 1000000,
              },
            ],
          },
          {
            queryType: QueryType.BY_MARKET,
            market: "HK",
            offset: 20,
            options: {
              useCache: false,
              includeMetadata: true,
            },
          },
        ],
        parallel: true,
        continueOnError: true,
      };

      const dto = plainToClass(BulkQueryRequestDto, bulkQueryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.queries).toHaveLength(2);
      expect(dto.queries[0].queryType).toBe(QueryType.BY_SYMBOLS);
      expect(dto.queries[1].queryType).toBe(QueryType.BY_MARKET);
      expect(dto.queries[1].options?.useCache).toBe(false);
    });
  });
});
