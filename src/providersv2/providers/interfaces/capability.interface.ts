/**
 * 数据源能力接口
 */
export type CapabilityTransport = "rest" | "websocket";
export type CapabilityApiType = "rest" | "stream";

export interface ICapability {
  name: string;
  description: string;
  supportedMarkets: string[];
  supportedSymbolFormats: string[];
  // transport: 传输层协议（REST / WebSocket）
  transport?: CapabilityTransport;
  // apiType: 执行形态（同步请求 / 流式订阅）
  apiType?: CapabilityApiType;
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
  execute(params: any): Promise<any>;
}
