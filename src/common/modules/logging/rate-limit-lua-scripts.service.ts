import { Injectable } from "@nestjs/common";

@Injectable()
export class RateLimitLuaScriptsService {
  getBasicRateLimitScript(): string {
    return `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current == false then
  redis.call('SETEX', key, window, 1)
  return {1, limit}
else
  current = tonumber(current)
  if current >= limit then
    return {current, limit}
  else
    redis.call('INCR', key)
    return {current + 1, limit}
  end
end
    `;
  }

  getSlidingWindowScript(): string {
    return `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window * 1000)
local current = redis.call('ZCARD', key)

if current < limit then
  redis.call('ZADD', key, now, now)
  redis.call('EXPIRE', key, window)
end

return {current + 1, limit}
    `;
  }
}
