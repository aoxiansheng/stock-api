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

import { ValidationPipe } from "@nestjs/common";
import { PIPES_METADATA } from "@nestjs/common/constants";
import { WsException } from "@nestjs/websockets";
import * as bcrypt from "bcrypt";
import { StreamUnsubscribeDto } from "@core/01-entry/stream-receiver/dto";
import { StreamReceiverGateway } from "@core/01-entry/stream-receiver/gateway/stream-receiver.gateway";

describe("StreamReceiverGateway auth + unsubscribe validation", () => {
  const createGateway = (options?: {
    findOneExecResult?: unknown;
    findOneExecReject?: Error;
  }) => {
    const streamReceiverService = {
      subscribeStream: jest.fn().mockResolvedValue(undefined),
      unsubscribeStream: jest.fn().mockResolvedValue(undefined),
    };

    const apiKeyModel = {
      findOne: jest.fn(() => ({
        exec: options?.findOneExecReject
          ? jest.fn().mockRejectedValue(options.findOneExecReject)
          : jest.fn().mockResolvedValue(options?.findOneExecResult),
      })),
    };

    const gateway = new StreamReceiverGateway(
      streamReceiverService as any,
      apiKeyModel as any,
      undefined,
      undefined,
    );

    return { gateway, streamReceiverService, apiKeyModel };
  };

  const createClient = (authenticated?: boolean) =>
    ({
      id: "client-1",
      data: {
        authenticated,
        apiKey: { name: "test-key" },
      },
      emit: jest.fn(),
      handshake: {
        auth: { appKey: "app-key", accessToken: "access-token" },
        query: {},
        headers: {},
      },
    }) as any;

  it("handleSubscribe: authenticated=true 时透传 connectionAuthenticated=true", async () => {
    const { gateway, streamReceiverService } = createGateway();
    const client = createClient(true);
    const payload = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "quote",
      token: "jwt-token",
    };

    await gateway.handleSubscribe(client, payload as any);

    expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
      payload,
      "client-1",
      undefined,
      { connectionAuthenticated: true },
    );
  });

  it("handleSubscribe: authenticated=false 时透传 connectionAuthenticated=false", async () => {
    const { gateway, streamReceiverService } = createGateway();
    const client = createClient(false);
    const payload = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "quote",
      token: "jwt-token",
    };

    await gateway.handleSubscribe(client, payload as any);

    expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
      payload,
      "client-1",
      undefined,
      { connectionAuthenticated: false },
    );
  });

  it("authenticateConnection: 认证异常后重置 client.data.authenticated=false", async () => {
    const { gateway } = createGateway({
      findOneExecReject: new Error("db unavailable"),
    });
    const client = createClient(true);

    const result = await (gateway as any).authenticateConnection(client);

    expect(result.success).toBe(false);
    expect(result.reason).toContain("Authentication error:");
    expect(client.data.authenticated).toBe(false);
  });

  it("authenticateConnection: 仅 query 提供凭据应拒绝认证", async () => {
    const { gateway, apiKeyModel } = createGateway({
      findOneExecResult: {
        _id: "id",
        appKey: "app-key",
        accessToken: "access-token",
      },
    });
    const client = createClient(true);
    client.handshake = {
      auth: {},
      query: { appKey: "app-key", accessToken: "access-token" },
      headers: {},
    };

    const result = await (gateway as any).authenticateConnection(client);

    expect(result).toEqual({
      success: false,
      reason: "Missing API Key or Access Token",
    });
    expect(apiKeyModel.findOne).not.toHaveBeenCalled();
  });

  it("authenticateConnection: permissions 为空时拒绝认证", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const { gateway } = createGateway({
      findOneExecResult: {
        _id: "id",
        appKey: "app-key",
        accessToken: "hashed-access-token",
        permissions: [],
      },
    });
    const client = createClient(true);

    const result = await (gateway as any).authenticateConnection(client);

    expect(result).toEqual({
      success: false,
      reason: "Insufficient stream permissions",
    });
    expect(client.data.authenticated).toBe(false);
  });

  it("unsubscribe 入口存在 ValidationPipe，并拦截非法 symbols", async () => {
    const { gateway, streamReceiverService } = createGateway();
    const client = createClient(true);
    const methodRef = StreamReceiverGateway.prototype.handleUnsubscribe;
    const pipes =
      (Reflect.getMetadata(PIPES_METADATA, methodRef) as ValidationPipe[]) ||
      [];
    const [validationPipe] = pipes;

    expect(validationPipe).toBeInstanceOf(ValidationPipe);

    await expect(
      validationPipe.transform(
        { symbols: "AAPL.US" },
        {
          type: "body",
          metatype: StreamUnsubscribeDto,
        } as any,
      ),
    ).rejects.toBeInstanceOf(WsException);

    expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalledWith(
      "unsubscribe-ack",
      expect.anything(),
    );
  });
});
