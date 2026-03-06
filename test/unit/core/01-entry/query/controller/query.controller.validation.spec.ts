import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { JwtAuthGuard, ApiKeyAuthGuard, PermissionsGuard } from "@authv2/guards";
import { QueryController } from "@core/01-entry/query/controller/query.controller";
import { QueryType } from "@core/01-entry/query/dto/query-types.dto";
import { QueryService } from "@core/01-entry/query/services/query.service";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

describe("QueryController queryTypeFilter 入口校验", () => {
  let app: INestApplication;

  const queryServiceMock = {
    executeQuery: jest.fn(),
    executeBulkQuery: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    queryServiceMock.executeQuery.mockResolvedValue({
      success: true,
      data: [],
      metadata: {
        queryType: QueryType.BY_SYMBOLS,
        totalResults: 0,
        returnedResults: 0,
        executionTime: 1,
        cacheUsed: true,
        dataSources: {
          cache: 0,
          persistent: 0,
          realtime: 0,
        },
      },
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [QueryController],
      providers: [
        {
          provide: QueryService,
          useValue: queryServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApiKeyAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /query/execute: 非法 queryTypeFilter 返回 400", async () => {
    const response = await request(app.getHttpServer())
      .post("/query/execute")
      .send({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        queryTypeFilter: "invalid-capability",
      })
      .expect(400);

    expect(queryServiceMock.executeQuery).not.toHaveBeenCalled();
    expect(response.body.message.join(" ")).toContain("queryTypeFilter");
  });

  it("POST /query/execute: stream-stock-quote 在 Query 入口返回 400", async () => {
    const response = await request(app.getHttpServer())
      .post("/query/execute")
      .send({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        queryTypeFilter: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      })
      .expect(400);

    expect(queryServiceMock.executeQuery).not.toHaveBeenCalled();
    expect(response.body.message.join(" ")).toContain("queryTypeFilter");
  });

  it("POST /query/execute: get-global-state 在 Query 入口返回 400", async () => {
    const response = await request(app.getHttpServer())
      .post("/query/execute")
      .send({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        queryTypeFilter: CAPABILITY_NAMES.GET_GLOBAL_STATE,
      })
      .expect(400);

    expect(queryServiceMock.executeQuery).not.toHaveBeenCalled();
    expect(response.body.message.join(" ")).toContain("queryTypeFilter");
  });

  it("POST /query/execute: 合法 queryTypeFilter 正常通过", async () => {
    await request(app.getHttpServer())
      .post("/query/execute")
      .send({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        queryTypeFilter: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      })
      .expect(200);

    expect(queryServiceMock.executeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryTypeFilter: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      }),
    );
  });

  it("POST /query/execute: 缺省 queryTypeFilter 走默认路径", async () => {
    await request(app.getHttpServer())
      .post("/query/execute")
      .send({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
      })
      .expect(200);

    const requestArg = queryServiceMock.executeQuery.mock.calls.at(-1)?.[0];
    expect(requestArg.queryTypeFilter).toBeUndefined();
  });

  it("GET /query/symbols: 非法 queryTypeFilter 返回 400", async () => {
    const response = await request(app.getHttpServer())
      .get("/query/symbols")
      .query({
        symbols: "AAPL,MSFT",
        queryTypeFilter: "invalid-capability",
      })
      .expect(400);

    expect(queryServiceMock.executeQuery).not.toHaveBeenCalled();
    expect(response.body.message.join(" ")).toContain("queryTypeFilter");
  });

  it("GET/POST: 非法 queryTypeFilter 错误信息一致", async () => {
    const invalidQueryTypeFilter = "invalid-capability";

    const postResponse = await request(app.getHttpServer())
      .post("/query/execute")
      .send({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL"],
        queryTypeFilter: invalidQueryTypeFilter,
      })
      .expect(400);

    const getResponse = await request(app.getHttpServer())
      .get("/query/symbols")
      .query({
        symbols: "AAPL",
        queryTypeFilter: invalidQueryTypeFilter,
      })
      .expect(400);

    expect(postResponse.body.statusCode).toBe(getResponse.body.statusCode);
    expect(postResponse.body.message).toEqual(getResponse.body.message);
  });

  it("GET /query/symbols: 合法 queryTypeFilter 正常通过", async () => {
    await request(app.getHttpServer())
      .get("/query/symbols")
      .query({
        symbols: "AAPL,MSFT",
        queryTypeFilter: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      })
      .expect(200);

    expect(queryServiceMock.executeQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryType: QueryType.BY_SYMBOLS,
        symbols: ["AAPL", "MSFT"],
        queryTypeFilter: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      }),
    );
  });

  it("GET /query/symbols: 缺省 queryTypeFilter 走默认路径", async () => {
    await request(app.getHttpServer())
      .get("/query/symbols")
      .query({ symbols: "AAPL,MSFT" })
      .expect(200);

    const requestArg = queryServiceMock.executeQuery.mock.calls.at(-1)?.[0];
    expect(requestArg.queryTypeFilter).toBeUndefined();
  });

  it("GET /query/symbols: symbols 超过上限返回 400", async () => {
    const tooManySymbols = Array.from({ length: 101 }, (_, i) => `A${i}`);

    await request(app.getHttpServer())
      .get("/query/symbols")
      .query({ symbols: tooManySymbols.join(",") })
      .expect(400);

    expect(queryServiceMock.executeQuery).not.toHaveBeenCalled();
  });

  it("GET /query/symbols: symbols 含非法格式返回 400", async () => {
    await request(app.getHttpServer())
      .get("/query/symbols")
      .query({ symbols: "AAPL,@@@" })
      .expect(400);

    expect(queryServiceMock.executeQuery).not.toHaveBeenCalled();
  });
});
