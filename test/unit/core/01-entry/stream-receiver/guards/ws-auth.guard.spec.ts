jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

import { WsAuthGuard } from "@core/01-entry/stream-receiver/guards/ws-auth.guard";
import * as bcrypt from "bcrypt";

describe("WsAuthGuard auth source hardening", () => {
  const createGuard = () => {
    const apiKeyModel = {
      findOne: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(null),
      })),
    };

    const guard = new WsAuthGuard(apiKeyModel as any);
    return { guard, apiKeyModel };
  };

  const createContext = (client: any, data: any = {}) =>
    ({
      switchToWs: () => ({
        getClient: () => client,
        getData: () => data,
      }),
    }) as any;

  it("仅在 query 中提供凭据时应拒绝，并且不触发数据库查询", async () => {
    const { guard, apiKeyModel } = createGuard();
    const client = {
      id: "client-1",
      handshake: {
        headers: {},
        query: {
          apiKey: "query-key",
          accessToken: "query-token",
        },
      },
      data: {},
    };
    const context = createContext(client);

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
    expect(apiKeyModel.findOne).not.toHaveBeenCalled();
  });

  it("extractAuthData: 仅保留 header 凭据，不读取 query", () => {
    const { guard } = createGuard();
    const client = {
      handshake: {
        headers: {
          "x-app-key": "header-key",
          "x-access-token": "header-token",
        },
        query: {
          apiKey: "query-key",
          accessToken: "query-token",
        },
      },
    };

    const authData = (guard as any).extractAuthData(client, {});

    expect(authData).toEqual({
      apiKey: "header-key",
      accessToken: "header-token",
    });
  });

  it("permissions 为空时拒绝认证", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const apiKeyModel = {
      findOne: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          _id: "id",
          appKey: "header-key",
          accessToken: "hashed-token",
          permissions: [],
        }),
      })),
    };
    const guard = new WsAuthGuard(apiKeyModel as any);
    const client = {
      id: "client-2",
      handshake: {
        headers: {
          "x-app-key": "header-key",
          "x-access-token": "header-token",
        },
        query: {},
      },
      data: {},
    };
    const context = createContext(client);

    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });
});
