jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { StreamIngressBindingService } from "@core/01-entry/stream-receiver/services/stream-ingress-binding.service";
import { StreamBatchProcessorService } from "@core/01-entry/stream-receiver/services/stream-batch-processor.service";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import { StreamConnection } from "@core/03-fetching/stream-data-fetcher/interfaces";

function createMocks() {
  return {
    batchProcessor: {
      addQuoteData: jest.fn(),
    },
    marketInferenceService: {
      inferMarkets: jest.fn(() => ["US"]),
      inferDominantMarket: jest.fn(() => "US"),
    },
  };
}

function createService(mocks: ReturnType<typeof createMocks>) {
  return new StreamIngressBindingService(
    mocks.batchProcessor as unknown as StreamBatchProcessorService,
    mocks.marketInferenceService as unknown as MarketInferenceService,
  );
}

describe("StreamIngressBindingService", () => {
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
  });

  // ── extractSymbolsFromData ──────────────────────────────────────────

  describe("extractSymbolsFromData", () => {
    it("should extract symbol from { symbol } format", () => {
      const service = createService(mocks);
      expect(service.extractSymbolsFromData({ symbol: "AAPL.US" })).toEqual(["AAPL.US"]);
    });

    it("should extract symbol from { s } format", () => {
      const service = createService(mocks);
      expect(service.extractSymbolsFromData({ s: "00700.HK" })).toEqual(["00700.HK"]);
    });

    it("should extract symbols from { symbols: [] } format", () => {
      const service = createService(mocks);
      expect(
        service.extractSymbolsFromData({ symbols: ["AAPL.US", "TSLA.US"] }),
      ).toEqual(["AAPL.US", "TSLA.US"]);
    });

    it("should extract symbol from { quote: { symbol } } format", () => {
      const service = createService(mocks);
      expect(
        service.extractSymbolsFromData({ quote: { symbol: "MSFT.US" } }),
      ).toEqual(["MSFT.US"]);
    });

    it("should extract symbol from { quote: { s } } format", () => {
      const service = createService(mocks);
      expect(
        service.extractSymbolsFromData({ quote: { s: "NVDA.US" } }),
      ).toEqual(["NVDA.US"]);
    });

    it("should extract symbol/s from array input", () => {
      const service = createService(mocks);
      expect(
        service.extractSymbolsFromData([
          { symbol: "AAPL.US" },
          { s: "00700.HK" },
          { symbol: "" },
          { s: null },
          { quote: { symbol: "MSFT.US" } },
          {},
        ]),
      ).toEqual(["AAPL.US", "00700.HK"]);
    });

    it("should ignore dirty array items without throwing", () => {
      const service = createService(mocks);
      expect(
        service.extractSymbolsFromData([
          null,
          undefined,
          1,
          "AAPL.US",
          { symbol: "AAPL.US" },
          { s: "00700.HK" },
        ]),
      ).toEqual(["AAPL.US", "00700.HK"]);
    });

    it.each([null, undefined, 0, "", "AAPL.US", { symbols: "AAPL.US" }, {}])(
      "should return empty array for invalid input %p",
      (invalidInput) => {
        const service = createService(mocks);
        expect(service.extractSymbolsFromData(invalidInput)).toEqual([]);
      },
    );
  });

  // ── setupDataReceiving ──────────────────────────────────────────────

  describe("setupDataReceiving", () => {
    it("should register onData, onError, onStatusChange callbacks", () => {
      const connection = {
        id: "conn-1",
        onData: jest.fn(),
        onError: jest.fn(),
        onStatusChange: jest.fn(),
      };

      const service = createService(mocks);
      service.setupDataReceiving(connection as unknown as StreamConnection, "longport", "quote");

      expect(connection.onData).toHaveBeenCalledWith(expect.any(Function));
      expect(connection.onError).toHaveBeenCalledWith(expect.any(Function));
      expect(connection.onStatusChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it("onData callback should push to batch processor", () => {
      const connection = {
        id: "conn-1",
        onData: jest.fn(),
        onError: jest.fn(),
        onStatusChange: jest.fn(),
      };

      const service = createService(mocks);
      service.setupDataReceiving(connection as unknown as StreamConnection, "longport", "quote");

      // Invoke the onData callback
      const onDataCallback = connection.onData.mock.calls[0][0];
      onDataCallback({ symbol: "AAPL.US", price: 190 });

      expect(mocks.batchProcessor.addQuoteData).toHaveBeenCalledWith(
        expect.objectContaining({
          rawData: { symbol: "AAPL.US", price: 190 },
          providerName: "longport",
          wsCapabilityType: "quote",
          symbols: ["AAPL.US"],
        }),
      );
    });

    it("should bind the same connection only once", () => {
      const connection = {
        id: "conn-1",
        onData: jest.fn(),
        onError: jest.fn(),
        onStatusChange: jest.fn(),
      };

      const service = createService(mocks);
      service.setupDataReceiving(
        connection as unknown as StreamConnection,
        "longport",
        "quote",
      );
      service.setupDataReceiving(
        connection as unknown as StreamConnection,
        "longport",
        "quote",
      );

      expect(connection.onData).toHaveBeenCalledTimes(1);
      expect(connection.onError).toHaveBeenCalledTimes(1);
      expect(connection.onStatusChange).toHaveBeenCalledTimes(1);
    });
  });

  // ── handleIncomingData ──────────────────────────────────────────────

  describe("handleIncomingData", () => {
    it("should push valid data to batch processor", () => {
      const service = createService(mocks);
      const rawData = { symbol: "AAPL.US", price: 190 };

      service.handleIncomingData(rawData, "longport", "quote");

      expect(mocks.batchProcessor.addQuoteData).toHaveBeenCalledWith(
        expect.objectContaining({
          rawData,
          providerName: "longport",
          wsCapabilityType: "quote",
          symbols: ["AAPL.US"],
        }),
      );
    });

    it("should not throw when data processing fails", () => {
      mocks.batchProcessor.addQuoteData.mockImplementation(() => {
        throw new Error("batch full");
      });

      const service = createService(mocks);
      expect(() =>
        service.handleIncomingData({ symbol: "AAPL.US" }, "longport", "quote"),
      ).not.toThrow();
    });
  });
});
