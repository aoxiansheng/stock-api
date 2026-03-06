import { REFERENCE_DATA } from "@common/constants/domain";
import {
  ACTIVE_PROVIDER_MANIFEST,
  PROVIDER_IDS,
  PROVIDER_NAME_ALIASES,
  buildProviderNameAliases,
} from "@providersv2/provider-id.constants";

describe("provider-id.constants", () => {
  it("PROVIDER_IDS 应从 REFERENCE_DATA.PROVIDER_IDS 派生", () => {
    expect(PROVIDER_IDS).toEqual({
      LONGPORT: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      LONGPORT_SG: REFERENCE_DATA.PROVIDER_IDS.LONGPORT_SG,
      JVQUANT: REFERENCE_DATA.PROVIDER_IDS.JVQUANT,
      INFOWAY: REFERENCE_DATA.PROVIDER_IDS.INFOWAY,
    });
  });

  it("manifest provider 集合应与 PROVIDER_IDS 完全一致且唯一", () => {
    const manifestIds = ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.id);
    const providerIds = Object.values(PROVIDER_IDS);

    expect([...manifestIds].sort((a, b) => a.localeCompare(b))).toEqual(
      [...providerIds].sort((a, b) => a.localeCompare(b)),
    );
    expect(new Set(manifestIds).size).toBe(manifestIds.length);
  });

  it("别名映射目标必须属于 active provider 集合", () => {
    const activeIds = new Set(Object.values(PROVIDER_IDS));
    for (const providerId of Object.values(PROVIDER_NAME_ALIASES)) {
      expect(activeIds.has(providerId)).toBe(true);
    }
  });

  it("alias 构建应先 trim + lower 后写入", () => {
    const aliases = buildProviderNameAliases([
      {
        id: PROVIDER_IDS.LONGPORT_SG,
        aliases: [" LongPortSG "],
      },
    ]);

    expect(aliases).toEqual({
      longportsg: PROVIDER_IDS.LONGPORT_SG,
    });
  });

  it("alias 归一化后冲突应抛错", () => {
    expect(() =>
      buildProviderNameAliases([
        {
          id: PROVIDER_IDS.LONGPORT,
          aliases: [" duplicate "],
        },
        {
          id: PROVIDER_IDS.INFOWAY,
          aliases: ["DUPLICATE"],
        },
      ]),
    ).toThrow(
      "Provider alias 冲突: alias=duplicate, providers=[infoway, longport]",
    );
  });
});
