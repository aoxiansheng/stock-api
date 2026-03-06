import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import {
  QUERY_TYPE_FILTER_WHITELIST,
  QueryRequestDto,
  QuerySymbolsRequestDto,
} from "@core/01-entry/query/dto/query-request.dto";
import { QueryType } from "@core/01-entry/query/dto/query-types.dto";
import { SUPPORTED_CAPABILITY_TYPES } from "@core/01-entry/receiver/constants/operations.constants";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

describe("Query DTO queryTypeFilter 白名单校验", () => {
  it("QueryRequestDto: 非法 queryTypeFilter 返回校验错误", async () => {
    const dto = plainToInstance(QueryRequestDto, {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ["AAPL"],
      queryTypeFilter: "invalid-capability",
    });

    const errors = await validate(dto);
    const queryTypeFilterError = errors.find(
      (error) => error.property === "queryTypeFilter",
    );

    expect(queryTypeFilterError?.constraints).toHaveProperty("isIn");
  });

  it("QueryRequestDto: 合法 queryTypeFilter 通过校验", async () => {
    const dto = plainToInstance(QueryRequestDto, {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ["AAPL"],
      queryTypeFilter: CAPABILITY_NAMES.GET_STOCK_QUOTE,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("QueryRequestDto: stream-stock-quote 在 Query 入口被拒绝", async () => {
    const dto = plainToInstance(QueryRequestDto, {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ["AAPL"],
      queryTypeFilter: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
    });

    const errors = await validate(dto);
    const queryTypeFilterError = errors.find(
      (error) => error.property === "queryTypeFilter",
    );

    expect(queryTypeFilterError?.constraints).toHaveProperty("isIn");
  });

  it("QueryRequestDto: get-global-state 在 Query 入口被拒绝", async () => {
    const dto = plainToInstance(QueryRequestDto, {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ["AAPL"],
      queryTypeFilter: CAPABILITY_NAMES.GET_GLOBAL_STATE,
    });

    const errors = await validate(dto);
    const queryTypeFilterError = errors.find(
      (error) => error.property === "queryTypeFilter",
    );

    expect(queryTypeFilterError?.constraints).toHaveProperty("isIn");
  });

  it("QueryRequestDto: 缺省 queryTypeFilter 通过校验", async () => {
    const dto = plainToInstance(QueryRequestDto, {
      queryType: QueryType.BY_SYMBOLS,
      symbols: ["AAPL"],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("QuerySymbolsRequestDto: 非法 queryTypeFilter 返回校验错误", async () => {
    const dto = plainToInstance(QuerySymbolsRequestDto, {
      symbols: "AAPL,MSFT",
      queryTypeFilter: "invalid-capability",
    });

    const errors = await validate(dto);
    const queryTypeFilterError = errors.find(
      (error) => error.property === "queryTypeFilter",
    );

    expect(queryTypeFilterError?.constraints).toHaveProperty("isIn");
  });

  it("QuerySymbolsRequestDto: 合法 queryTypeFilter 通过校验", async () => {
    const dto = plainToInstance(QuerySymbolsRequestDto, {
      symbols: "AAPL,MSFT",
      queryTypeFilter: CAPABILITY_NAMES.GET_STOCK_QUOTE,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("QuerySymbolsRequestDto: 缺省 queryTypeFilter 通过校验", async () => {
    const dto = plainToInstance(QuerySymbolsRequestDto, {
      symbols: "AAPL,MSFT",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("白名单契约: Query 白名单与 receiver 支持集合保持一致", () => {
    expect(new Set(QUERY_TYPE_FILTER_WHITELIST)).toEqual(
      new Set(SUPPORTED_CAPABILITY_TYPES),
    );
  });
});
