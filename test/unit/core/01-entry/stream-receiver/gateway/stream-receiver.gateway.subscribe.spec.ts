jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { ValidationPipe } from "@nestjs/common";
import { PIPES_METADATA } from "@nestjs/common/constants";
import { WsException } from "@nestjs/websockets";

import { STREAM_RECEIVER_ERROR_CODES } from "@core/01-entry/stream-receiver/constants/stream-receiver-error-codes.constants";
import { StreamSubscribeDto } from "@core/01-entry/stream-receiver/dto";
import { StreamReceiverGateway } from "@core/01-entry/stream-receiver/gateway/stream-receiver.gateway";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

describe("StreamReceiverGateway subscribe(sessionId)", () => {
  function createGateway() {
    const streamReceiverService = {
      subscribeStream: jest.fn().mockResolvedValue(undefined),
      unsubscribeStream: jest.fn().mockResolvedValue(undefined),
    };
    const chartIntradayStreamSubscriptionService = {
      validateWsSessionBinding: jest.fn().mockResolvedValue({
        sessionId: "chart_session_abc123",
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      }),
      bindRealtimeClientToSession: jest.fn().mockResolvedValue({
        sessionId: "chart_session_abc123",
      }),
      unbindRealtimeClientSessions: jest.fn().mockResolvedValue(undefined),
      touchRealtimeSessionsForClient: jest.fn(),
      unbindRealtimeClient: jest.fn(),
    };

    const gateway = new StreamReceiverGateway(
      streamReceiverService as any,
      chartIntradayStreamSubscriptionService as any,
      {} as any,
      undefined,
      undefined,
    );

    return {
      gateway,
      streamReceiverService,
      chartIntradayStreamSubscriptionService,
    };
  }

  function createClient() {
    return {
      id: "client-1",
      data: {
        authenticated: true,
        apiKey: {
          name: "test-app-key",
          userId: "user-1",
        },
      },
      disconnect: jest.fn(),
      emit: jest.fn(),
    } as any;
  }

  it("subscribe 入口存在 ValidationPipe，并拦截非法 symbols", async () => {
    const { gateway, streamReceiverService } = createGateway();
    const methodRef = StreamReceiverGateway.prototype.handleSubscribe;
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
          metatype: StreamSubscribeDto,
        } as any,
      ),
    ).rejects.toBeInstanceOf(WsException);

    expect(streamReceiverService.subscribeStream).not.toHaveBeenCalled();
  });

  it("subscribe 入口应拦截空白 sessionId", async () => {
    const { gateway, streamReceiverService } = createGateway();
    const methodRef = StreamReceiverGateway.prototype.handleSubscribe;
    const pipes =
      (Reflect.getMetadata(PIPES_METADATA, methodRef) as ValidationPipe[]) ||
      [];
    const [validationPipe] = pipes;

    await expect(
      validationPipe.transform(
        { symbols: ["AAPL.US"], sessionId: "   " },
        {
          type: "body",
          metatype: StreamSubscribeDto,
        } as any,
      ),
    ).rejects.toBeInstanceOf(WsException);

    expect(streamReceiverService.subscribeStream).not.toHaveBeenCalled();
  });

  it("sessionId 合法时应使用 session 绑定的 provider/capability 发起订阅并绑定 client", async () => {
    const {
      gateway,
      streamReceiverService,
      chartIntradayStreamSubscriptionService,
    } =
      createGateway();
    const client = createClient();

    await gateway.handleSubscribe(client, {
      symbols: ["aapl.us"],
      sessionId: "chart_session_abc123",
      wsCapabilityType: "quote",
    } as any);

    expect(
      chartIntradayStreamSubscriptionService.validateWsSessionBinding,
    ).toHaveBeenCalledWith({
      sessionId: "chart_session_abc123",
      symbol: "AAPL.US",
      provider: "",
      ownerIdentity: "user:user-1",
    });
    expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
      expect.objectContaining({
        symbols: ["AAPL.US"],
        preferredProvider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        sessionId: "chart_session_abc123",
      }),
      "client-1",
      undefined,
      { connectionAuthenticated: true },
    );
    expect(
      chartIntradayStreamSubscriptionService.bindRealtimeClientToSession,
    ).toHaveBeenCalledWith({
      sessionId: "chart_session_abc123",
      clientId: "client-1",
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "user:user-1",
    });
    expect(client.emit).toHaveBeenCalledWith(
      "subscribe-ack",
      expect.objectContaining({
        success: true,
      }),
    );
  });

  it("sessionId 非法时应返回 subscribe-error，且不调用订阅 service", async () => {
    const {
      gateway,
      streamReceiverService,
      chartIntradayStreamSubscriptionService,
    } =
      createGateway();
    const client = createClient();
    chartIntradayStreamSubscriptionService.validateWsSessionBinding.mockRejectedValueOnce(
      new Error("SESSION_NOT_FOUND"),
    );

    await gateway.handleSubscribe(client, {
      symbols: ["AAPL.US"],
      sessionId: "bad-session",
    } as any);

    expect(streamReceiverService.subscribeStream).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith(
      "subscribe-error",
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: STREAM_RECEIVER_ERROR_CODES.DATA_VALIDATION_FAILED,
        }),
      }),
    );
  });

  it("validateWsSessionBinding 遇到非 session 冲突错误时应保持服务异常语义", async () => {
    const {
      gateway,
      streamReceiverService,
      chartIntradayStreamSubscriptionService,
    } = createGateway();
    const client = createClient();
    chartIntradayStreamSubscriptionService.validateWsSessionBinding.mockRejectedValueOnce(
      new Error("upstream subscribe failed"),
    );

    await gateway.handleSubscribe(client, {
      symbols: ["AAPL.US"],
      sessionId: "chart_session_abc123",
    } as any);

    expect(streamReceiverService.subscribeStream).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith(
      "subscribe-error",
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
          message: "upstream subscribe failed",
        }),
      }),
    );
  });

  it("session 绑定失败时应回滚已建立的 client 订阅", async () => {
    const {
      gateway,
      streamReceiverService,
      chartIntradayStreamSubscriptionService,
    } = createGateway();
    const client = createClient();
    chartIntradayStreamSubscriptionService.bindRealtimeClientToSession.mockRejectedValueOnce(
      new Error("SESSION_OWNER_MISMATCH"),
    );

    await gateway.handleSubscribe(client, {
      symbols: ["AAPL.US"],
      sessionId: "chart_session_abc123",
    } as any);

    expect(streamReceiverService.subscribeStream).toHaveBeenCalledTimes(1);
    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["AAPL.US"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        preferredProvider: "infoway",
      },
      "client-1",
    );
    expect(client.emit).toHaveBeenCalledWith(
      "subscribe-error",
      expect.objectContaining({
        success: false,
      }),
    );
    expect(client.emit).not.toHaveBeenCalledWith(
      "subscribe-ack",
      expect.anything(),
    );
  });

  it("回滚失败时应返回 fatal 错误并主动断开连接", async () => {
    const {
      gateway,
      streamReceiverService,
      chartIntradayStreamSubscriptionService,
    } = createGateway();
    const client = createClient();
    chartIntradayStreamSubscriptionService.bindRealtimeClientToSession.mockRejectedValueOnce(
      new Error("SESSION_OWNER_MISMATCH"),
    );
    streamReceiverService.unsubscribeStream.mockRejectedValueOnce(
      new Error("rollback failed"),
    );

    await gateway.handleSubscribe(client, {
      symbols: ["AAPL.US"],
      sessionId: "chart_session_abc123",
    } as any);

    expect(streamReceiverService.subscribeStream).toHaveBeenCalledTimes(1);
    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledTimes(1);
    expect(client.emit).toHaveBeenCalledWith(
      "subscribe-error",
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
          message:
            "Subscription rollback failed; connection state is unsafe and will be closed",
        }),
      }),
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.emit).not.toHaveBeenCalledWith(
      "subscribe-ack",
      expect.anything(),
    );
  });

  it("unsubscribe 成功后应按 symbol 解绑当前 client 的分时图 session", async () => {
    const {
      gateway,
      streamReceiverService,
      chartIntradayStreamSubscriptionService,
    } = createGateway();
    const client = createClient();

    await gateway.handleUnsubscribe(client, {
      symbols: ["aapl.us", "msft.us"],
      wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
    } as any);

    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["aapl.us", "msft.us"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      },
      "client-1",
    );
    expect(
      chartIntradayStreamSubscriptionService.unbindRealtimeClientSessions,
    ).toHaveBeenCalledWith({
      clientId: "client-1",
      symbols: ["AAPL.US", "MSFT.US"],
    });
    expect(client.emit).toHaveBeenCalledWith(
      "unsubscribe-ack",
      expect.objectContaining({
        success: true,
      }),
    );
  });

  it("ping 应刷新当前 client 绑定的分时图会话活跃时间", async () => {
    const { gateway, chartIntradayStreamSubscriptionService } = createGateway();
    const client = createClient();

    await gateway.handlePing(client);

    expect(
      chartIntradayStreamSubscriptionService.touchRealtimeSessionsForClient,
    ).toHaveBeenCalledWith("client-1");
    expect(client.emit).toHaveBeenCalledWith(
      "pong",
      expect.objectContaining({
        timestamp: expect.any(Number),
      }),
    );
  });
});
