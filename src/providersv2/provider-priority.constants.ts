import {
  ACTIVE_PROVIDER_MANIFEST,
  type ProviderId,
} from "./provider-id.constants";

export const PROVIDER_REGISTRATION_ORDER: readonly ProviderId[] = Object.freeze(
  ACTIVE_PROVIDER_MANIFEST.map((entry) => entry.id),
);
