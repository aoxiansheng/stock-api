import type { ScheduledUpstreamRelease } from "../../../03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service";

export interface UnsubscribeStreamResult {
  unsubscribedSymbols: string[];
  upstreamReleasedSymbols: string[];
  upstreamScheduledSymbols: ScheduledUpstreamRelease[];
}

export interface UnsubscribeStreamOptions {
  onUpstreamReleased?: (
    releasedSymbols: string[],
  ) => Promise<void> | void;
}
