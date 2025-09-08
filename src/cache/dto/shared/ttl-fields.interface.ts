export interface TTLFields {
  ttl?: number;
  expiresAt?: Date;
  remainingTime?: number;
}

export interface OptionalTTL {
  ttl?: number;
}

export interface BaseTTL {
  ttl: number;
}