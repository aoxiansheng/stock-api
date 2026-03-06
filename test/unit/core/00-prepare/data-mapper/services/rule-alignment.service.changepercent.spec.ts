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
});
