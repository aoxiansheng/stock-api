import {
  ACTIVE_PROVIDER_MANIFEST,
  type ProviderId,
} from "./provider-id.constants";

export const DEFAULT_PROVIDER_PRIORITY = 100;

export const PROVIDER_PRIORITIES: Readonly<Record<ProviderId, number>> =
  Object.freeze(
    ACTIVE_PROVIDER_MANIFEST.reduce(
      (acc, entry) => {
        acc[entry.id] = entry.priority;
        return acc;
      },
      {} as Record<ProviderId, number>,
    ),
  );
