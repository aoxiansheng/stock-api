import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { JwtAuthGuard, ApiKeyAuthGuard, PermissionsGuard } from "@authv2/guards";
import { MappingRuleController } from "@core/00-prepare/data-mapper/controller/mapping-rule.controller";
import { RULE_LIST_TYPES } from "@core/00-prepare/data-mapper/constants/data-mapper.constants";
import { PersistedTemplateService } from "@core/00-prepare/data-mapper/services/persisted-template.service";
import { FlexibleMappingRuleService } from "@core/00-prepare/data-mapper/services/flexible-mapping-rule.service";
import { RuleAlignmentService } from "@core/00-prepare/data-mapper/services/rule-alignment.service";

describe("MappingRuleController transDataRuleListType 入口校验", () => {
  let app: INestApplication;

  const ruleServiceMock = {
    findRules: jest.fn(),
  };
  const ruleAlignmentServiceMock = {
    previewAlignment: jest.fn(),
    generateRuleFromTemplate: jest.fn(),
  };
  const persistedTemplateServiceMock = {
    getPersistedTemplateById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    ruleServiceMock.findRules.mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    persistedTemplateServiceMock.getPersistedTemplateById.mockResolvedValue({
      _id: "template-1",
      name: "template-name",
      provider: "infoway",
      apiType: "rest",
    });
    ruleAlignmentServiceMock.previewAlignment.mockResolvedValue([]);
    ruleAlignmentServiceMock.generateRuleFromTemplate.mockResolvedValue({
      rule: { id: "rule-1" },
      alignmentResult: {
        totalFields: 0,
        alignedFields: 0,
        unalignedFields: [],
        suggestions: [],
      },
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MappingRuleController],
      providers: [
        {
          provide: FlexibleMappingRuleService,
          useValue: ruleServiceMock,
        },
        {
          provide: RuleAlignmentService,
          useValue: ruleAlignmentServiceMock,
        },
        {
          provide: PersistedTemplateService,
          useValue: persistedTemplateServiceMock,
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

  it("GET /data-mapper/rules: 合法分页参数会转为 number 并调用 service", async () => {
    await request(app.getHttpServer())
      .get("/data-mapper/rules")
      .query({
        page: "2",
        limit: "20",
        transDataRuleListType: RULE_LIST_TYPES.TRADING_DAYS_FIELDS,
      })
      .expect(200);

    expect(ruleServiceMock.findRules).toHaveBeenCalledWith(
      2,
      20,
      undefined,
      undefined,
      RULE_LIST_TYPES.TRADING_DAYS_FIELDS,
    );
  });

  it("GET /data-mapper/rules: provider/apiType/transDataRuleListType 会 trim+lower 后传入 service", async () => {
    await request(app.getHttpServer())
      .get("/data-mapper/rules")
      .query({
        provider: "  InFoWay  ",
        apiType: "  STREAM  ",
        transDataRuleListType: "  QUOTE_FIELDS  ",
      })
      .expect(200);

    expect(ruleServiceMock.findRules).toHaveBeenCalledWith(
      1,
      50,
      "infoway",
      "stream",
      RULE_LIST_TYPES.QUOTE_FIELDS,
    );
  });

  it.each([
    ["空白", { provider: "   " }, undefined],
    ["具体值", { provider: "  InFoWay  " }, "infoway"],
    ["未传", {}, undefined],
  ] as const)(
    "GET /data-mapper/rules: provider %s 时按兼容语义传入 service",
    async (_caseName, query, expectedProvider) => {
      await request(app.getHttpServer())
        .get("/data-mapper/rules")
        .query(query)
        .expect(200);

      expect(ruleServiceMock.findRules).toHaveBeenCalledWith(
        1,
        50,
        expectedProvider,
        undefined,
        undefined,
      );
    },
  );

  it("GET /data-mapper/rules: page 非数字时返回 400", async () => {
    const response = await request(app.getHttpServer())
      .get("/data-mapper/rules")
      .query({ page: "abc" })
      .expect(400);

    expect(ruleServiceMock.findRules).not.toHaveBeenCalled();
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining("页码必须为数字")]),
    );
  });

  it("GET /data-mapper/rules: limit=0 时返回 400", async () => {
    const response = await request(app.getHttpServer())
      .get("/data-mapper/rules")
      .query({ limit: "0" })
      .expect(400);

    expect(ruleServiceMock.findRules).not.toHaveBeenCalled();
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining("每页条数必须大于0")]),
    );
  });

  it("GET /data-mapper/rules: transDataRuleListType 非法时返回 400", async () => {
    const response = await request(app.getHttpServer())
      .get("/data-mapper/rules")
      .query({ transDataRuleListType: "invalid_rule_type" })
      .expect(400);

    expect(ruleServiceMock.findRules).not.toHaveBeenCalled();
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining("不支持的 transDataRuleListType")]),
    );
  });

  it("GET /data-mapper/rules: apiType 非法时返回 400", async () => {
    const response = await request(app.getHttpServer())
      .get("/data-mapper/rules")
      .query({ apiType: "websocket" })
      .expect(400);

    expect(ruleServiceMock.findRules).not.toHaveBeenCalled();
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining("不支持的 apiType")]),
    );
  });

  it("POST /data-mapper/rules/preview-alignment/:templateId: 缺少 transDataRuleListType 时返回 400", async () => {
    const response = await request(app.getHttpServer())
      .post("/data-mapper/rules/preview-alignment/template-1")
      .expect(400);

    expect(ruleAlignmentServiceMock.previewAlignment).not.toHaveBeenCalled();
    expect(response.body.message).toEqual(
      expect.arrayContaining(["transDataRuleListType 是必填参数"]),
    );
  });

  it("POST /data-mapper/rules/preview-alignment/:templateId: transDataRuleListType 非法时返回 400", async () => {
    const response = await request(app.getHttpServer())
      .post("/data-mapper/rules/preview-alignment/template-1")
      .query({ transDataRuleListType: "invalid_rule_type" })
      .expect(400);

    expect(ruleAlignmentServiceMock.previewAlignment).not.toHaveBeenCalled();
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining("不支持的 transDataRuleListType")]),
    );
  });

  it("POST /data-mapper/rules/generate-from-template/:templateId: ruleName 仅空白时返回 400", async () => {
    const response = await request(app.getHttpServer())
      .post("/data-mapper/rules/generate-from-template/template-1")
      .send({
        transDataRuleListType: RULE_LIST_TYPES.QUOTE_FIELDS,
        ruleName: "   ",
      })
      .expect(400);

    expect(ruleAlignmentServiceMock.generateRuleFromTemplate).not.toHaveBeenCalled();
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining("ruleName 不能为空白字符")]),
    );
  });

  it("POST /data-mapper/rules/generate-from-template/:templateId: ruleName 会 trim 后传入 service", async () => {
    await request(app.getHttpServer())
      .post("/data-mapper/rules/generate-from-template/template-1")
      .send({
        transDataRuleListType: RULE_LIST_TYPES.QUOTE_FIELDS,
        ruleName: "  Auto Rule  ",
      })
      .expect(201);

    expect(ruleAlignmentServiceMock.generateRuleFromTemplate).toHaveBeenCalledWith(
      "template-1",
      RULE_LIST_TYPES.QUOTE_FIELDS,
      "Auto Rule",
    );
  });
});
