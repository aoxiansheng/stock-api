export interface UpstreamAcquireParams {
  clientId: string;
  provider: string;
  capability: string;
  symbols: string[];
}

export interface UpstreamReleaseParams {
  clientId: string;
  provider: string;
  capability: string;
  symbols: string[];
}

export interface PendingUnsubscribeEntry {
  symbolKey: string;
  provider: string;
  capability: string;
  symbol: string;
  timer: NodeJS.Timeout;
  scheduledAt: number;
}
