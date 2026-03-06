const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockConnections: Array<{
  readyState: number;
  close: jest.Mock<Promise<void>, [boolean?]>;
}> = [];

class MockConnection {}

jest.mock("mongoose", () => ({
  Connection: MockConnection,
  connections: mockConnections,
  disconnect: mockDisconnect,
}));

jest.mock("@src/app.module", () => ({
  AppModule: class MockAppModule {},
}));

import { cleanupTestApp } from "@test/e2e/helpers/test-setup.helper";

describe("cleanupTestApp", () => {
  beforeEach(() => {
    mockDisconnect.mockClear();
    mockConnections.splice(0, mockConnections.length);
  });

  it("provider 不存在分支仍会执行 forceCloseMongooseConnections", async () => {
    const app = {
      close: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = {
      get: jest.fn(() => {
        throw new Error("Nest could not find given element");
      }),
    };

    await cleanupTestApp({
      app: app as any,
      moduleRef: moduleRef as any,
      httpServer: {},
    });

    expect(moduleRef.get).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(app.close).toHaveBeenCalledTimes(1);
  });
});
