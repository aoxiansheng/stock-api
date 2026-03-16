import { getCryptoBasicInfo } from "@providersv2/providers/coingecko/capabilities/get-crypto-basic-info";

describe("coingecko REST capability metadata contract", () => {
  it("get-crypto-basic-info 必须声明 transport/apiType=rest", () => {
    expect(getCryptoBasicInfo.transport).toBe("rest");
    expect(getCryptoBasicInfo.apiType).toBe("rest");
  });
});
