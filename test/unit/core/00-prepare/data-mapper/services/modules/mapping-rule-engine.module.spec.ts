import { MappingRuleEngineModule } from "@core/00-prepare/data-mapper/services/modules/mapping-rule-engine.module";

describe("MappingRuleEngineModule changePercent contract", () => {
  it("pc=0.72 时，changePercent 保持 0.72（不做 *100）", async () => {
    const module = new MappingRuleEngineModule();
    const rule = {
      fieldMappings: [
        {
          sourceFieldPath: "pc",
          targetField: "changePercent",
          isRequired: true,
        },
      ],
    } as any;

    const result = await module.applyFlexibleMappingRule(rule, { pc: 0.72 });

    expect(result.success).toBe(true);
    expect(result.transformedData).toMatchObject({
      changePercent: 0.72,
    });
    expect(result.transformedData.changePercent).not.toBe(72);
    expect(result.mappingStats.successfulMappings).toBe(1);
  });
});
