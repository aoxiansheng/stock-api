import { RuleAlignmentService } from "@core/00-prepare/data-mapper/services/rule-alignment.service";
import { MarketTypeResolverService } from "@core/00-prepare/data-mapper/services/market-type-resolver.service";

describe("RuleAlignmentService changepercent token match", () => {
  function createService(): RuleAlignmentService {
    return new RuleAlignmentService(
      {} as any,
      {} as any,
      new MarketTypeResolverService(),
    );
  }

  it("source token 为 pc 时，changePercent 命中高置信度匹配", () => {
    const service = createService();

    const confidence = (service as any).calculateFieldMatchConfidence(
      "changePercent",
      {
        fieldName: "pc",
        fieldPath: "quote.pc",
        fieldType: "number",
      },
    );

    expect(confidence).toBe(0.9);
  });

  it("source token 非 pc（如 apc）时，不应因 includes 误命中 changePercent", () => {
    const service = createService();

    const confidence = (service as any).calculateFieldMatchConfidence(
      "changePercent",
      {
        fieldName: "apc_ratio",
        fieldPath: "quote.apc_ratio",
        fieldType: "number",
      },
    );

    expect(confidence).toBeLessThan(0.8);
  });

  it("source token 为 l 时，应命中 lowPrice 而不是 symbol 的模糊匹配", () => {
    const service = createService();

    const lowPriceConfidence = (service as any).calculateFieldMatchConfidence(
      "lowPrice",
      {
        fieldName: "l",
        fieldPath: "respList.l",
        fieldType: "number",
      },
    );
    const symbolConfidence = (service as any).calculateFieldMatchConfidence(
      "symbol",
      {
        fieldName: "l",
        fieldPath: "respList.l",
        fieldType: "number",
      },
    );

    expect(lowPriceConfidence).toBe(0.9);
    expect(symbolConfidence).toBeLessThan(0.8);
  });

  it("source token 为 c 时，应命中 lastPrice", () => {
    const service = createService();

    const confidence = (service as any).calculateFieldMatchConfidence(
      "lastPrice",
      {
        fieldName: "c",
        fieldPath: "respList.c",
        fieldType: "number",
      },
    );

    expect(confidence).toBe(0.9);
  });

  it("source token 为 td 时，应命中 tradeDirection", () => {
    const service = createService();

    const confidence = (service as any).calculateFieldMatchConfidence(
      "tradeDirection",
      {
        fieldName: "td",
        fieldPath: "quote.td",
        fieldType: "number",
      },
    );

    expect(confidence).toBe(0.9);
  });
});
