import { RuleAlignmentService } from "@core/00-prepare/data-mapper/services/rule-alignment.service";
import { MarketTypeResolverService } from "@core/00-prepare/data-mapper/services/market-type-resolver.service";

describe("RuleAlignmentService crypto basic info fields", () => {
  function createService(): RuleAlignmentService {
    return new RuleAlignmentService(
      {} as any,
      {} as any,
      new MarketTypeResolverService(),
    );
  }

  it("basic_info_fields 预设字段应包含 crypto 市值与供应量字段", () => {
    const service = createService();
    const targetFields = (service as any).PRESET_TARGET_FIELDS.basic_info_fields;

    expect(targetFields).toEqual(
      expect.arrayContaining([
        "currentPrice",
        "marketCap",
        "marketCapRank",
        "circulatingSupply",
        "totalSupply",
        "maxSupply",
        "fullyDilutedValuation",
      ]),
    );
  });

  it("marketCap 对 market_cap 的匹配置信度应为高置信度", () => {
    const service = createService();

    const confidence = (service as any).calculateFieldMatchConfidence(
      "marketCap",
      {
        fieldName: "market_cap",
        fieldPath: "market_cap",
        fieldType: "number",
      },
    );

    expect(confidence).toBeGreaterThanOrEqual(0.9);
  });
});
