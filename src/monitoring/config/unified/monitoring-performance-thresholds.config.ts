/**
 * 监控组件统一性能阈值配置类
 * 
 * 📋 职责边界：
 * ==========================================
 * 本文件统一管理所有监控组件的性能阈值配置，消除重复定义：
 * 
 * ✅ 统一性能阈值配置源：
 * - API响应时间阈值 (HTTP/WebSocket/内部服务)
 * - 缓存性能阈值 (Redis/应用层/内存缓存)
 * - 数据库性能阈值 (MongoDB/Redis查询/聚合)
 * - 系统资源阈值 (CPU/内存/磁盘/连接池)
 * - 吞吐量和并发阈值
 * - 错误率和健康状态阈值
 * 
 * ✅ 环境变量支持：
 * - 支持通过环境变量覆盖默认值
 * - 提供生产/开发/测试环境的不同默认值
 * 
 * ✅ 类型安全：
 * - 使用class-validator进行验证
 * - 提供完整的TypeScript类型支持
 * 
 * ❌ 替换的重复配置：
 * - cache-performance.constants.ts 中的所有阈值
 * - response-performance.constants.ts 中的所有阈值
 * - database-performance.constants.ts 中的所有阈值
 * - business.ts 中的性能和健康阈值
 * - monitoring.config.ts 中的 performance 配置部分
 * 
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import { IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { registerAs } from '@nestjs/config';

/**
 * API响应时间阈值配置
 * 🚀 HTTP API、WebSocket、内部服务的响应时间标准
 */
export class ApiResponseThresholdsConfig {
  /**
   * HTTP API响应时间 - 优秀阈值（毫秒）
   * 
   * 用途：判断HTTP API响应时间是否优秀
   * 业务影响：用户无感知的响应速度
   * 
   * 环境推荐值：
   * - 开发环境：100-150ms
   * - 测试环境：50-100ms
   * - 生产环境：100ms
   * 
   * 环境变量：MONITORING_API_RESPONSE_EXCELLENT_MS
   */
  @IsNumber({}, { message: 'API响应优秀阈值必须是数字' })
  @Min(10, { message: 'API响应优秀阈值最小值为10ms' })
  @Max(500, { message: 'API响应优秀阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  apiExcellentMs: number = 100;

  /**
   * HTTP API响应时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: 'API响应良好阈值必须是数字' })
  @Min(50, { message: 'API响应良好阈值最小值为50ms' })
  @Max(1000, { message: 'API响应良好阈值最大值为1000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  apiGoodMs: number = 300;

  /**
   * HTTP API响应时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: 'API响应警告阈值必须是数字' })
  @Min(200, { message: 'API响应警告阈值最小值为200ms' })
  @Max(5000, { message: 'API响应警告阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  apiWarningMs: number = 1000;

  /**
   * HTTP API响应时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: 'API响应较差阈值必须是数字' })
  @Min(1000, { message: 'API响应较差阈值最小值为1000ms' })
  @Max(10000, { message: 'API响应较差阈值最大值为10000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3000 : parsed;
  })
  apiPoorMs: number = 3000;

  /**
   * HTTP API响应时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: 'API响应严重阈值必须是数字' })
  @Min(2000, { message: 'API响应严重阈值最小值为2000ms' })
  @Max(30000, { message: 'API响应严重阈值最大值为30000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5000 : parsed;
  })
  apiCriticalMs: number = 5000;

  /**
   * WebSocket响应时间 - 优秀阈值（毫秒）
   * WebSocket实时通信的响应时间要求更严格
   */
  @IsNumber({}, { message: 'WebSocket响应优秀阈值必须是数字' })
  @Min(5, { message: 'WebSocket响应优秀阈值最小值为5ms' })
  @Max(200, { message: 'WebSocket响应优秀阈值最大值为200ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  websocketExcellentMs: number = 50;

  /**
   * WebSocket响应时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: 'WebSocket响应良好阈值必须是数字' })
  @Min(20, { message: 'WebSocket响应良好阈值最小值为20ms' })
  @Max(500, { message: 'WebSocket响应良好阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  websocketGoodMs: number = 100;

  /**
   * WebSocket响应时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: 'WebSocket响应警告阈值必须是数字' })
  @Min(50, { message: 'WebSocket响应警告阈值最小值为50ms' })
  @Max(1000, { message: 'WebSocket响应警告阈值最大值为1000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 200 : parsed;
  })
  websocketWarningMs: number = 200;

  /**
   * WebSocket响应时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: 'WebSocket响应较差阈值必须是数字' })
  @Min(100, { message: 'WebSocket响应较差阈值最小值为100ms' })
  @Max(2000, { message: 'WebSocket响应较差阈值最大值为2000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  websocketPoorMs: number = 500;

  /**
   * WebSocket响应时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: 'WebSocket响应严重阈值必须是数字' })
  @Min(500, { message: 'WebSocket响应严重阈值最小值为500ms' })
  @Max(5000, { message: 'WebSocket响应严重阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  websocketCriticalMs: number = 1000;

  /**
   * 内部服务调用响应时间 - 优秀阈值（毫秒）
   */
  @IsNumber({}, { message: '内部服务响应优秀阈值必须是数字' })
  @Min(5, { message: '内部服务响应优秀阈值最小值为5ms' })
  @Max(200, { message: '内部服务响应优秀阈值最大值为200ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  internalServiceExcellentMs: number = 50;

  /**
   * 内部服务调用响应时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: '内部服务响应良好阈值必须是数字' })
  @Min(50, { message: '内部服务响应良好阈值最小值为50ms' })
  @Max(500, { message: '内部服务响应良好阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 150 : parsed;
  })
  internalServiceGoodMs: number = 150;

  /**
   * 内部服务调用响应时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: '内部服务响应警告阈值必须是数字' })
  @Min(200, { message: '内部服务响应警告阈值最小值为200ms' })
  @Max(2000, { message: '内部服务响应警告阈值最大值为2000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  internalServiceWarningMs: number = 500;

  /**
   * 内部服务调用响应时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: '内部服务响应较差阈值必须是数字' })
  @Min(500, { message: '内部服务响应较差阈值最小值为500ms' })
  @Max(5000, { message: '内部服务响应较差阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  internalServicePoorMs: number = 1000;

  /**
   * 内部服务调用响应时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: '内部服务响应严重阈值必须是数字' })
  @Min(1000, { message: '内部服务响应严重阈值最小值为1000ms' })
  @Max(10000, { message: '内部服务响应严重阈值最大值为10000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 2000 : parsed;
  })
  internalServiceCriticalMs: number = 2000;
}

/**
 * 缓存性能阈值配置
 * 🚀 Redis、应用层缓存、内存缓存的性能标准
 */
export class CachePerformanceThresholdsConfig {
  /**
   * Redis缓存命中率 - 优秀阈值（0.0-1.0）
   * Redis缓存命中率是最重要的缓存性能指标
   */
  @IsNumber({}, { message: 'Redis缓存命中率优秀阈值必须是数字' })
  @Min(0.8, { message: 'Redis缓存命中率优秀阈值最小值为0.8' })
  @Max(1.0, { message: 'Redis缓存命中率优秀阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.95 : parsed;
  })
  redisHitRateExcellent: number = 0.95;

  /**
   * Redis缓存命中率 - 良好阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'Redis缓存命中率良好阈值必须是数字' })
  @Min(0.7, { message: 'Redis缓存命中率良好阈值最小值为0.7' })
  @Max(1.0, { message: 'Redis缓存命中率良好阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.85 : parsed;
  })
  redisHitRateGood: number = 0.85;

  /**
   * Redis缓存命中率 - 警告阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'Redis缓存命中率警告阈值必须是数字' })
  @Min(0.5, { message: 'Redis缓存命中率警告阈值最小值为0.5' })
  @Max(1.0, { message: 'Redis缓存命中率警告阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.70 : parsed;
  })
  redisHitRateWarning: number = 0.70;

  /**
   * Redis缓存命中率 - 较差阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'Redis缓存命中率较差阈值必须是数字' })
  @Min(0.2, { message: 'Redis缓存命中率较差阈值最小值为0.2' })
  @Max(1.0, { message: 'Redis缓存命中率较差阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.50 : parsed;
  })
  redisHitRatePoor: number = 0.50;

  /**
   * Redis缓存命中率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'Redis缓存命中率严重阈值必须是数字' })
  @Min(0.1, { message: 'Redis缓存命中率严重阈值最小值为0.1' })
  @Max(0.8, { message: 'Redis缓存命中率严重阈值最大值为0.8' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.30 : parsed;
  })
  redisHitRateCritical: number = 0.30;

  /**
   * Redis响应时间 - 优秀阈值（毫秒）
   * Redis作为内存缓存，响应时间应该非常快
   */
  @IsNumber({}, { message: 'Redis响应时间优秀阈值必须是数字' })
  @Min(1, { message: 'Redis响应时间优秀阈值最小值为1ms' })
  @Max(50, { message: 'Redis响应时间优秀阈值最大值为50ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5 : parsed;
  })
  redisResponseExcellentMs: number = 5;

  /**
   * Redis响应时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: 'Redis响应时间良好阈值必须是数字' })
  @Min(5, { message: 'Redis响应时间良好阈值最小值为5ms' })
  @Max(100, { message: 'Redis响应时间良好阈值最大值为100ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  redisResponseGoodMs: number = 20;

  /**
   * Redis响应时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: 'Redis响应时间警告阈值必须是数字' })
  @Min(20, { message: 'Redis响应时间警告阈值最小值为20ms' })
  @Max(200, { message: 'Redis响应时间警告阈值最大值为200ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  redisResponseWarningMs: number = 50;

  /**
   * Redis响应时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: 'Redis响应时间较差阈值必须是数字' })
  @Min(50, { message: 'Redis响应时间较差阈值最小值为50ms' })
  @Max(500, { message: 'Redis响应时间较差阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  redisResponsePoorMs: number = 100;

  /**
   * Redis响应时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: 'Redis响应时间严重阈值必须是数字' })
  @Min(100, { message: 'Redis响应时间严重阈值最小值为100ms' })
  @Max(2000, { message: 'Redis响应时间严重阈值最大值为2000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  redisResponseCriticalMs: number = 500;

  /**
   * 应用层缓存命中率 - 优秀阈值（0.0-1.0）
   * 应用层缓存（如Smart Cache）的命中率监控
   */
  @IsNumber({}, { message: '应用缓存命中率优秀阈值必须是数字' })
  @Min(0.8, { message: '应用缓存命中率优秀阈值最小值为0.8' })
  @Max(1.0, { message: '应用缓存命中率优秀阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.90 : parsed;
  })
  appCacheHitRateExcellent: number = 0.90;

  /**
   * 应用层缓存命中率 - 良好阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '应用缓存命中率良好阈值必须是数字' })
  @Min(0.6, { message: '应用缓存命中率良好阈值最小值为0.6' })
  @Max(1.0, { message: '应用缓存命中率良好阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.75 : parsed;
  })
  appCacheHitRateGood: number = 0.75;

  /**
   * 应用层缓存命中率 - 警告阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '应用缓存命中率警告阈值必须是数字' })
  @Min(0.4, { message: '应用缓存命中率警告阈值最小值为0.4' })
  @Max(1.0, { message: '应用缓存命中率警告阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.60 : parsed;
  })
  appCacheHitRateWarning: number = 0.60;

  /**
   * 应用层缓存命中率 - 较差阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '应用缓存命中率较差阈值必须是数字' })
  @Min(0.2, { message: '应用缓存命中率较差阈值最小值为0.2' })
  @Max(1.0, { message: '应用缓存命中率较差阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.40 : parsed;
  })
  appCacheHitRatePoor: number = 0.40;

  /**
   * 应用层缓存命中率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '应用缓存命中率严重阈值必须是数字' })
  @Min(0.1, { message: '应用缓存命中率严重阈值最小值为0.1' })
  @Max(0.6, { message: '应用缓存命中率严重阈值最大值为0.6' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.20 : parsed;
  })
  appCacheHitRateCritical: number = 0.20;

  /**
   * 内存缓存命中率 - 优秀阈值（0.0-1.0）
   * 内存中LRU缓存（如Symbol Mapper Cache）的命中率监控
   */
  @IsNumber({}, { message: '内存缓存命中率优秀阈值必须是数字' })
  @Min(0.7, { message: '内存缓存命中率优秀阈值最小值为0.7' })
  @Max(1.0, { message: '内存缓存命中率优秀阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.85 : parsed;
  })
  memoryCacheHitRateExcellent: number = 0.85;

  /**
   * 内存缓存命中率 - 良好阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存缓存命中率良好阈值必须是数字' })
  @Min(0.5, { message: '内存缓存命中率良好阈值最小值为0.5' })
  @Max(1.0, { message: '内存缓存命中率良好阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.70 : parsed;
  })
  memoryCacheHitRateGood: number = 0.70;

  /**
   * 内存缓存命中率 - 警告阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存缓存命中率警告阈值必须是数字' })
  @Min(0.3, { message: '内存缓存命中率警告阈值最小值为0.3' })
  @Max(1.0, { message: '内存缓存命中率警告阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.50 : parsed;
  })
  memoryCacheHitRateWarning: number = 0.50;

  /**
   * 内存缓存命中率 - 较差阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存缓存命中率较差阈值必须是数字' })
  @Min(0.1, { message: '内存缓存命中率较差阈值最小值为0.1' })
  @Max(1.0, { message: '内存缓存命中率较差阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.30 : parsed;
  })
  memoryCacheHitRatePoor: number = 0.30;

  /**
   * 内存缓存命中率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存缓存命中率严重阈值必须是数字' })
  @Min(0.05, { message: '内存缓存命中率严重阈值最小值为0.05' })
  @Max(0.5, { message: '内存缓存命中率严重阈值最大值为0.5' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.10 : parsed;
  })
  memoryCacheHitRateCritical: number = 0.10;

  /**
   * 缓存读取操作时间 - 优秀阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存读取时间优秀阈值必须是数字' })
  @Min(1, { message: '缓存读取时间优秀阈值最小值为1ms' })
  @Max(50, { message: '缓存读取时间优秀阈值最大值为50ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5 : parsed;
  })
  cacheReadExcellentMs: number = 5;

  /**
   * 缓存读取操作时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存读取时间良好阈值必须是数字' })
  @Min(5, { message: '缓存读取时间良好阈值最小值为5ms' })
  @Max(100, { message: '缓存读取时间良好阈值最大值为100ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  cacheReadGoodMs: number = 20;

  /**
   * 缓存读取操作时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存读取时间警告阈值必须是数字' })
  @Min(20, { message: '缓存读取时间警告阈值最小值为20ms' })
  @Max(500, { message: '缓存读取时间警告阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  cacheReadWarningMs: number = 100;

  /**
   * 缓存读取操作时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存读取时间较差阈值必须是数字' })
  @Min(100, { message: '缓存读取时间较差阈值最小值为100ms' })
  @Max(2000, { message: '缓存读取时间较差阈值最大值为2000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  cacheReadPoorMs: number = 500;

  /**
   * 缓存读取操作时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存读取时间严重阈值必须是数字' })
  @Min(500, { message: '缓存读取时间严重阈值最小值为500ms' })
  @Max(10000, { message: '缓存读取时间严重阈值最大值为10000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 2000 : parsed;
  })
  cacheReadCriticalMs: number = 2000;

  /**
   * 缓存写入操作时间 - 优秀阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存写入时间优秀阈值必须是数字' })
  @Min(5, { message: '缓存写入时间优秀阈值最小值为5ms' })
  @Max(100, { message: '缓存写入时间优秀阈值最大值为100ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  cacheWriteExcellentMs: number = 10;

  /**
   * 缓存写入操作时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存写入时间良好阈值必须是数字' })
  @Min(10, { message: '缓存写入时间良好阈值最小值为10ms' })
  @Max(200, { message: '缓存写入时间良好阈值最大值为200ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  cacheWriteGoodMs: number = 50;

  /**
   * 缓存写入操作时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存写入时间警告阈值必须是数字' })
  @Min(50, { message: '缓存写入时间警告阈值最小值为50ms' })
  @Max(1000, { message: '缓存写入时间警告阈值最大值为1000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 200 : parsed;
  })
  cacheWriteWarningMs: number = 200;

  /**
   * 缓存写入操作时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存写入时间较差阈值必须是数字' })
  @Min(200, { message: '缓存写入时间较差阈值最小值为200ms' })
  @Max(5000, { message: '缓存写入时间较差阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  cacheWritePoorMs: number = 1000;

  /**
   * 缓存写入操作时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: '缓存写入时间严重阈值必须是数字' })
  @Min(1000, { message: '缓存写入时间严重阈值最小值为1000ms' })
  @Max(30000, { message: '缓存写入时间严重阈值最大值为30000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5000 : parsed;
  })
  cacheWriteCriticalMs: number = 5000;
}

/**
 * 数据库性能阈值配置
 * 🗄️ MongoDB、Redis查询、聚合操作的性能标准
 */
export class DatabasePerformanceThresholdsConfig {
  /**
   * MongoDB查询时间 - 优秀阈值（毫秒）
   * MongoDB查询性能监控的核心阈值
   */
  @IsNumber({}, { message: 'MongoDB查询时间优秀阈值必须是数字' })
  @Min(10, { message: 'MongoDB查询时间优秀阈值最小值为10ms' })
  @Max(200, { message: 'MongoDB查询时间优秀阈值最大值为200ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  mongoQueryExcellentMs: number = 50;

  /**
   * MongoDB查询时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: 'MongoDB查询时间良好阈值必须是数字' })
  @Min(50, { message: 'MongoDB查询时间良好阈值最小值为50ms' })
  @Max(500, { message: 'MongoDB查询时间良好阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 200 : parsed;
  })
  mongoQueryGoodMs: number = 200;

  /**
   * MongoDB查询时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: 'MongoDB查询时间警告阈值必须是数字' })
  @Min(200, { message: 'MongoDB查询时间警告阈值最小值为200ms' })
  @Max(5000, { message: 'MongoDB查询时间警告阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  mongoQueryWarningMs: number = 1000;

  /**
   * MongoDB查询时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: 'MongoDB查询时间较差阈值必须是数字' })
  @Min(1000, { message: 'MongoDB查询时间较差阈值最小值为1000ms' })
  @Max(10000, { message: 'MongoDB查询时间较差阈值最大值为10000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3000 : parsed;
  })
  mongoQueryPoorMs: number = 3000;

  /**
   * MongoDB查询时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: 'MongoDB查询时间严重阈值必须是数字' })
  @Min(3000, { message: 'MongoDB查询时间严重阈值最小值为3000ms' })
  @Max(60000, { message: 'MongoDB查询时间严重阈值最大值为60000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10000 : parsed;
  })
  mongoQueryCriticalMs: number = 10000;

  /**
   * 聚合查询时间 - 优秀阈值（毫秒）
   * 复杂聚合查询的性能监控，通常比普通查询耗时更长
   */
  @IsNumber({}, { message: '聚合查询时间优秀阈值必须是数字' })
  @Min(50, { message: '聚合查询时间优秀阈值最小值为50ms' })
  @Max(1000, { message: '聚合查询时间优秀阈值最大值为1000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 200 : parsed;
  })
  aggregationQueryExcellentMs: number = 200;

  /**
   * 聚合查询时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: '聚合查询时间良好阈值必须是数字' })
  @Min(200, { message: '聚合查询时间良好阈值最小值为200ms' })
  @Max(5000, { message: '聚合查询时间良好阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  aggregationQueryGoodMs: number = 1000;

  /**
   * 聚合查询时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: '聚合查询时间警告阈值必须是数字' })
  @Min(1000, { message: '聚合查询时间警告阈值最小值为1000ms' })
  @Max(30000, { message: '聚合查询时间警告阈值最大值为30000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5000 : parsed;
  })
  aggregationQueryWarningMs: number = 5000;

  /**
   * 聚合查询时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: '聚合查询时间较差阈值必须是数字' })
  @Min(5000, { message: '聚合查询时间较差阈值最小值为5000ms' })
  @Max(60000, { message: '聚合查询时间较差阈值最大值为60000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 15000 : parsed;
  })
  aggregationQueryPoorMs: number = 15000;

  /**
   * 聚合查询时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: '聚合查询时间严重阈值必须是数字' })
  @Min(15000, { message: '聚合查询时间严重阈值最小值为15000ms' })
  @Max(300000, { message: '聚合查询时间严重阈值最大值为300000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30000 : parsed;
  })
  aggregationQueryCriticalMs: number = 30000;

  /**
   * 数据库连接建立时间 - 优秀阈值（毫秒）
   */
  @IsNumber({}, { message: '数据库连接时间优秀阈值必须是数字' })
  @Min(10, { message: '数据库连接时间优秀阈值最小值为10ms' })
  @Max(500, { message: '数据库连接时间优秀阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  dbConnectionExcellentMs: number = 100;

  /**
   * 数据库连接建立时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: '数据库连接时间良好阈值必须是数字' })
  @Min(100, { message: '数据库连接时间良好阈值最小值为100ms' })
  @Max(1000, { message: '数据库连接时间良好阈值最大值为1000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  dbConnectionGoodMs: number = 300;

  /**
   * 数据库连接建立时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: '数据库连接时间警告阈值必须是数字' })
  @Min(300, { message: '数据库连接时间警告阈值最小值为300ms' })
  @Max(5000, { message: '数据库连接时间警告阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  dbConnectionWarningMs: number = 1000;

  /**
   * 数据库连接建立时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: '数据库连接时间较差阈值必须是数字' })
  @Min(1000, { message: '数据库连接时间较差阈值最小值为1000ms' })
  @Max(15000, { message: '数据库连接时间较差阈值最大值为15000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3000 : parsed;
  })
  dbConnectionPoorMs: number = 3000;

  /**
   * 数据库连接建立时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: '数据库连接时间严重阈值必须是数字' })
  @Min(3000, { message: '数据库连接时间严重阈值最小值为3000ms' })
  @Max(60000, { message: '数据库连接时间严重阈值最大值为60000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10000 : parsed;
  })
  dbConnectionCriticalMs: number = 10000;

  /**
   * 连接池使用率 - 优秀阈值（百分比 0-100）
   */
  @IsNumber({}, { message: '连接池使用率优秀阈值必须是数字' })
  @Min(0, { message: '连接池使用率优秀阈值最小值为0%' })
  @Max(50, { message: '连接池使用率优秀阈值最大值为50%' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30 : parsed;
  })
  connectionPoolUsageExcellent: number = 30;

  /**
   * 连接池使用率 - 良好阈值（百分比 0-100）
   */
  @IsNumber({}, { message: '连接池使用率良好阈值必须是数字' })
  @Min(20, { message: '连接池使用率良好阈值最小值为20%' })
  @Max(70, { message: '连接池使用率良好阈值最大值为70%' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  connectionPoolUsageGood: number = 50;

  /**
   * 连接池使用率 - 警告阈值（百分比 0-100）
   */
  @IsNumber({}, { message: '连接池使用率警告阈值必须是数字' })
  @Min(50, { message: '连接池使用率警告阈值最小值为50%' })
  @Max(85, { message: '连接池使用率警告阈值最大值为85%' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 70 : parsed;
  })
  connectionPoolUsageWarning: number = 70;

  /**
   * 连接池使用率 - 较差阈值（百分比 0-100）
   */
  @IsNumber({}, { message: '连接池使用率较差阈值必须是数字' })
  @Min(70, { message: '连接池使用率较差阈值最小值为70%' })
  @Max(95, { message: '连接池使用率较差阈值最大值为95%' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 85 : parsed;
  })
  connectionPoolUsagePoor: number = 85;

  /**
   * 连接池使用率 - 严重阈值（百分比 0-100）
   */
  @IsNumber({}, { message: '连接池使用率严重阈值必须是数字' })
  @Min(85, { message: '连接池使用率严重阈值最小值为85%' })
  @Max(100, { message: '连接池使用率严重阈值最大值为100%' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 95 : parsed;
  })
  connectionPoolUsageCritical: number = 95;

  /**
   * 事务执行时间 - 优秀阈值（毫秒）
   */
  @IsNumber({}, { message: '事务执行时间优秀阈值必须是数字' })
  @Min(10, { message: '事务执行时间优秀阈值最小值为10ms' })
  @Max(500, { message: '事务执行时间优秀阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  transactionExcellentMs: number = 100;

  /**
   * 事务执行时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: '事务执行时间良好阈值必须是数字' })
  @Min(100, { message: '事务执行时间良好阈值最小值为100ms' })
  @Max(2000, { message: '事务执行时间良好阈值最大值为2000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  transactionGoodMs: number = 500;

  /**
   * 事务执行时间 - 警告阈值（毫秒）
   */
  @IsNumber({}, { message: '事务执行时间警告阈值必须是数字' })
  @Min(500, { message: '事务执行时间警告阈值最小值为500ms' })
  @Max(10000, { message: '事务执行时间警告阈值最大值为10000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 2000 : parsed;
  })
  transactionWarningMs: number = 2000;

  /**
   * 事务执行时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: '事务执行时间较差阈值必须是数字' })
  @Min(2000, { message: '事务执行时间较差阈值最小值为2000ms' })
  @Max(60000, { message: '事务执行时间较差阈值最大值为60000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10000 : parsed;
  })
  transactionPoorMs: number = 10000;

  /**
   * 事务执行时间 - 严重阈值（毫秒）
   */
  @IsNumber({}, { message: '事务执行时间严重阈值必须是数字' })
  @Min(10000, { message: '事务执行时间严重阈值最小值为10000ms' })
  @Max(300000, { message: '事务执行时间严重阈值最大值为300000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30000 : parsed;
  })
  transactionCriticalMs: number = 30000;
}

/**
 * 吞吐量和并发阈值配置
 * 📊 系统处理能力的量化标准
 */
export class ThroughputConcurrencyThresholdsConfig {
  /**
   * API吞吐量 - 优秀阈值（请求数/秒 RPS）
   */
  @IsNumber({}, { message: 'API吞吐量优秀阈值必须是数字' })
  @Min(100, { message: 'API吞吐量优秀阈值最小值为100 RPS' })
  @Max(10000, { message: 'API吞吐量优秀阈值最大值为10000 RPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  apiThroughputExcellentRps: number = 1000;

  /**
   * API吞吐量 - 良好阈值（请求数/秒 RPS）
   */
  @IsNumber({}, { message: 'API吞吐量良好阈值必须是数字' })
  @Min(50, { message: 'API吞吐量良好阈值最小值为50 RPS' })
  @Max(5000, { message: 'API吞吐量良好阈值最大值为5000 RPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  apiThroughputGoodRps: number = 500;

  /**
   * API吞吐量 - 警告阈值（请求数/秒 RPS）
   */
  @IsNumber({}, { message: 'API吞吐量警告阈值必须是数字' })
  @Min(10, { message: 'API吞吐量警告阈值最小值为10 RPS' })
  @Max(1000, { message: 'API吞吐量警告阈值最大值为1000 RPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  apiThroughputWarningRps: number = 100;

  /**
   * API吞吐量 - 较差阈值（请求数/秒 RPS）
   */
  @IsNumber({}, { message: 'API吞吐量较差阈值必须是数字' })
  @Min(5, { message: 'API吞吐量较差阈值最小值为5 RPS' })
  @Max(200, { message: 'API吞吐量较差阈值最大值为200 RPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  apiThroughputPoorRps: number = 50;

  /**
   * API吞吐量 - 严重阈值（请求数/秒 RPS）
   */
  @IsNumber({}, { message: 'API吞吐量严重阈值必须是数字' })
  @Min(1, { message: 'API吞吐量严重阈值最小值为1 RPS' })
  @Max(50, { message: 'API吞吐量严重阈值最大值为50 RPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  apiThroughputCriticalRps: number = 10;

  /**
   * 并发请求处理 - 优秀阈值（并发数）
   */
  @IsNumber({}, { message: '并发请求优秀阈值必须是数字' })
  @Min(100, { message: '并发请求优秀阈值最小值为100' })
  @Max(5000, { message: '并发请求优秀阈值最大值为5000' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  concurrentRequestsExcellent: number = 1000;

  /**
   * 并发请求处理 - 良好阈值（并发数）
   */
  @IsNumber({}, { message: '并发请求良好阈值必须是数字' })
  @Min(50, { message: '并发请求良好阈值最小值为50' })
  @Max(2000, { message: '并发请求良好阈值最大值为2000' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  concurrentRequestsGood: number = 500;

  /**
   * 并发请求处理 - 警告阈值（并发数）
   */
  @IsNumber({}, { message: '并发请求警告阈值必须是数字' })
  @Min(20, { message: '并发请求警告阈值最小值为20' })
  @Max(1000, { message: '并发请求警告阈值最大值为1000' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 200 : parsed;
  })
  concurrentRequestsWarning: number = 200;

  /**
   * 并发请求处理 - 较差阈值（并发数）
   */
  @IsNumber({}, { message: '并发请求较差阈值必须是数字' })
  @Min(10, { message: '并发请求较差阈值最小值为10' })
  @Max(500, { message: '并发请求较差阈值最大值为500' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  concurrentRequestsPoor: number = 100;

  /**
   * 并发请求处理 - 严重阈值（并发数）
   */
  @IsNumber({}, { message: '并发请求严重阈值必须是数字' })
  @Min(5, { message: '并发请求严重阈值最小值为5' })
  @Max(200, { message: '并发请求严重阈值最大值为200' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 50 : parsed;
  })
  concurrentRequestsCritical: number = 50;

  /**
   * WebSocket消息吞吐量 - 优秀阈值（消息数/秒 MPS）
   */
  @IsNumber({}, { message: 'WebSocket消息吞吐量优秀阈值必须是数字' })
  @Min(1000, { message: 'WebSocket消息吞吐量优秀阈值最小值为1000 MPS' })
  @Max(20000, { message: 'WebSocket消息吞吐量优秀阈值最大值为20000 MPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5000 : parsed;
  })
  websocketThroughputExcellentMps: number = 5000;

  /**
   * WebSocket消息吞吐量 - 良好阈值（消息数/秒 MPS）
   */
  @IsNumber({}, { message: 'WebSocket消息吞吐量良好阈值必须是数字' })
  @Min(500, { message: 'WebSocket消息吞吐量良好阈值最小值为500 MPS' })
  @Max(10000, { message: 'WebSocket消息吞吐量良好阈值最大值为10000 MPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 2000 : parsed;
  })
  websocketThroughputGoodMps: number = 2000;

  /**
   * WebSocket消息吞吐量 - 警告阈值（消息数/秒 MPS）
   */
  @IsNumber({}, { message: 'WebSocket消息吞吐量警告阈值必须是数字' })
  @Min(100, { message: 'WebSocket消息吞吐量警告阈值最小值为100 MPS' })
  @Max(2000, { message: 'WebSocket消息吞吐量警告阈值最大值为2000 MPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  websocketThroughputWarningMps: number = 500;

  /**
   * WebSocket消息吞吐量 - 较差阈值（消息数/秒 MPS）
   */
  @IsNumber({}, { message: 'WebSocket消息吞吐量较差阈值必须是数字' })
  @Min(20, { message: 'WebSocket消息吞吐量较差阈值最小值为20 MPS' })
  @Max(1000, { message: 'WebSocket消息吞吐量较差阈值最大值为1000 MPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  websocketThroughputPoorMps: number = 100;

  /**
   * WebSocket消息吞吐量 - 严重阈值（消息数/秒 MPS）
   */
  @IsNumber({}, { message: 'WebSocket消息吞吐量严重阈值必须是数字' })
  @Min(5, { message: 'WebSocket消息吞吐量严重阈值最小值为5 MPS' })
  @Max(100, { message: 'WebSocket消息吞吐量严重阈值最大值为100 MPS' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 20 : parsed;
  })
  websocketThroughputCriticalMps: number = 20;

  /**
   * 数据处理吞吐量 - 优秀阈值（记录数/秒）
   */
  @IsNumber({}, { message: '数据处理吞吐量优秀阈值必须是数字' })
  @Min(1000, { message: '数据处理吞吐量优秀阈值最小值为1000 记录/秒' })
  @Max(50000, { message: '数据处理吞吐量优秀阈值最大值为50000 记录/秒' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10000 : parsed;
  })
  dataProcessingExcellentRps: number = 10000;

  /**
   * 数据处理吞吐量 - 良好阈值（记录数/秒）
   */
  @IsNumber({}, { message: '数据处理吞吐量良好阈值必须是数字' })
  @Min(500, { message: '数据处理吞吐量良好阈值最小值为500 记录/秒' })
  @Max(20000, { message: '数据处理吞吐量良好阈值最大值为20000 记录/秒' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5000 : parsed;
  })
  dataProcessingGoodRps: number = 5000;

  /**
   * 数据处理吞吐量 - 警告阈值（记录数/秒）
   */
  @IsNumber({}, { message: '数据处理吞吐量警告阈值必须是数字' })
  @Min(100, { message: '数据处理吞吐量警告阈值最小值为100 记录/秒' })
  @Max(5000, { message: '数据处理吞吐量警警阈值最大值为5000 记录/秒' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  dataProcessingWarningRps: number = 1000;

  /**
   * 数据处理吞吐量 - 较差阈值（记录数/秒）
   */
  @IsNumber({}, { message: '数据处理吞吐量较差阈值必须是数字' })
  @Min(50, { message: '数据处理吞吐量较差阈值最小值为50 记录/秒' })
  @Max(2000, { message: '数据处理吞吐量较差阈值最大值为2000 记录/秒' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  dataProcessingPoorRps: number = 500;

  /**
   * 数据处理吞吐量 - 严重阈值（记录数/秒）
   */
  @IsNumber({}, { message: '数据处理吞吐量严重阈值必须是数字' })
  @Min(10, { message: '数据处理吞吐量严重阈值最小值为10 记录/秒' })
  @Max(500, { message: '数据处理吞吐量严重阈值最大值为500 记录/秒' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  dataProcessingCriticalRps: number = 100;
}

/**
 * 系统资源阈值配置
 * 💾 CPU、内存、磁盘、网络等系统资源的监控标准
 */
export class SystemResourceThresholdsConfig {
  /**
   * CPU使用率 - 良好阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'CPU使用率良好阈值必须是数字' })
  @Min(0.1, { message: 'CPU使用率良好阈值最小值为0.1' })
  @Max(0.8, { message: 'CPU使用率良好阈值最大值为0.8' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.3 : parsed;
  })
  cpuUsageLow: number = 0.3;

  /**
   * CPU使用率 - 中等阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'CPU使用率中等阈值必须是数字' })
  @Min(0.3, { message: 'CPU使用率中等阈值最小值为0.3' })
  @Max(0.9, { message: 'CPU使用率中等阈值最大值为0.9' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.5 : parsed;
  })
  cpuUsageMedium: number = 0.5;

  /**
   * CPU使用率 - 高阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'CPU使用率高阈值必须是数字' })
  @Min(0.5, { message: 'CPU使用率高阈值最小值为0.5' })
  @Max(1.0, { message: 'CPU使用率高阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.7 : parsed;
  })
  cpuUsageHigh: number = 0.7;

  /**
   * CPU使用率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: 'CPU使用率严重阈值必须是数字' })
  @Min(0.7, { message: 'CPU使用率严重阈值最小值为0.7' })
  @Max(1.0, { message: 'CPU使用率严重阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.9 : parsed;
  })
  cpuUsageCritical: number = 0.9;

  /**
   * 内存使用率 - 良好阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存使用率良好阈值必须是数字' })
  @Min(0.1, { message: '内存使用率良好阈值最小值为0.1' })
  @Max(0.8, { message: '内存使用率良好阈值最大值为0.8' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.4 : parsed;
  })
  memoryUsageLow: number = 0.4;

  /**
   * 内存使用率 - 中等阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存使用率中等阈值必须是数字' })
  @Min(0.4, { message: '内存使用率中等阈值最小值为0.4' })
  @Max(0.9, { message: '内存使用率中等阈值最大值为0.9' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.6 : parsed;
  })
  memoryUsageMedium: number = 0.6;

  /**
   * 内存使用率 - 高阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存使用率高阈值必须是数字' })
  @Min(0.6, { message: '内存使用率高阈值最小值为0.6' })
  @Max(1.0, { message: '内存使用率高阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.75 : parsed;
  })
  memoryUsageHigh: number = 0.75;

  /**
   * 内存使用率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '内存使用率严重阈值必须是数字' })
  @Min(0.8, { message: '内存使用率严重阈值最小值为0.8' })
  @Max(1.0, { message: '内存使用率严重阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.95 : parsed;
  })
  memoryUsageCritical: number = 0.95;

  /**
   * 磁盘使用率 - 警告阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '磁盘使用率警告阈值必须是数字' })
  @Min(0.5, { message: '磁盘使用率警告阈值最小值为0.5' })
  @Max(1.0, { message: '磁盘使用率警告阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.8 : parsed;
  })
  diskUsageWarning: number = 0.8;

  /**
   * 磁盘使用率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '磁盘使用率严重阈值必须是数字' })
  @Min(0.8, { message: '磁盘使用率严重阈值最小值为0.8' })
  @Max(1.0, { message: '磁盘使用率严重阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.9 : parsed;
  })
  diskUsageCritical: number = 0.9;

  /**
   * 磁盘使用率 - 紧急阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '磁盘使用率紧急阈值必须是数字' })
  @Min(0.9, { message: '磁盘使用率紧急阈值最小值为0.9' })
  @Max(1.0, { message: '磁盘使用率紧急阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.95 : parsed;
  })
  diskUsageEmergency: number = 0.95;

  /**
   * 网络连接数 - 警告阈值
   */
  @IsNumber({}, { message: '网络连接数警告阈值必须是数字' })
  @Min(100, { message: '网络连接数警告阈值最小值为100' })
  @Max(50000, { message: '网络连接数警告阈值最大值为50000' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  connectionCountWarning: number = 1000;

  /**
   * 网络连接数 - 严重阈值
   */
  @IsNumber({}, { message: '网络连接数严重阈值必须是数字' })
  @Min(1000, { message: '网络连接数严重阈值最小值为1000' })
  @Max(100000, { message: '网络连接数严重阈值最大值为100000' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5000 : parsed;
  })
  connectionCountCritical: number = 5000;

  /**
   * 网络连接数 - 紧急阈值
   */
  @IsNumber({}, { message: '网络连接数紧急阈值必须是数字' })
  @Min(5000, { message: '网络连接数紧急阈值最小值为5000' })
  @Max(200000, { message: '网络连接数紧急阈值最大值为200000' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10000 : parsed;
  })
  connectionCountEmergency: number = 10000;

  /**
   * 文件描述符使用率 - 警告阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '文件描述符使用率警告阈值必须是数字' })
  @Min(0.5, { message: '文件描述符使用率警告阈值最小值为0.5' })
  @Max(1.0, { message: '文件描述符使用率警告阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.7 : parsed;
  })
  fdUsageWarning: number = 0.7;

  /**
   * 文件描述符使用率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '文件描述符使用率严重阈值必须是数字' })
  @Min(0.7, { message: '文件描述符使用率严重阈值最小值为0.7' })
  @Max(1.0, { message: '文件描述符使用率严重阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.85 : parsed;
  })
  fdUsageCritical: number = 0.85;

  /**
   * 文件描述符使用率 - 紧急阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '文件描述符使用率紧急阈值必须是数字' })
  @Min(0.85, { message: '文件描述符使用率紧急阈值最小值为0.85' })
  @Max(1.0, { message: '文件描述符使用率紧急阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.95 : parsed;
  })
  fdUsageEmergency: number = 0.95;
}

/**
 * 错误率和可用性阈值配置
 * 🚨 系统稳定性和错误处理的监控标准
 */
export class ErrorRateAvailabilityThresholdsConfig {
  /**
   * 错误率 - 可接受阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '错误率可接受阈值必须是数字' })
  @Min(0.001, { message: '错误率可接受阈值最小值为0.001' })
  @Max(0.2, { message: '错误率可接受阈值最大值为0.2' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.05 : parsed;
  })
  errorRateAcceptable: number = 0.05;

  /**
   * 错误率 - 警告阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '错误率警告阈值必须是数字' })
  @Min(0.05, { message: '错误率警告阈值最小值为0.05' })
  @Max(0.5, { message: '错误率警告阈值最大值为0.5' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.1 : parsed;
  })
  errorRateWarning: number = 0.1;

  /**
   * 错误率 - 严重阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '错误率严重阈值必须是数字' })
  @Min(0.1, { message: '错误率严重阈值最小值为0.1' })
  @Max(0.8, { message: '错误率严重阈值最大值为0.8' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.2 : parsed;
  })
  errorRateCritical: number = 0.2;

  /**
   * 错误率 - 紧急阈值（0.0-1.0）
   */
  @IsNumber({}, { message: '错误率紧急阈值必须是数字' })
  @Min(0.2, { message: '错误率紧急阈值最小值为0.2' })
  @Max(1.0, { message: '错误率紧急阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.3 : parsed;
  })
  errorRateEmergency: number = 0.3;

  /**
   * 可用性目标阈值（0.0-1.0）
   * SLA服务等级协议目标
   */
  @IsNumber({}, { message: '可用性目标阈值必须是数字' })
  @Min(0.9, { message: '可用性目标阈值最小值为0.9' })
  @Max(1.0, { message: '可用性目标阈值最大值为1.0' })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.999 : parsed;
  })
  availabilityTarget: number = 0.999;

  /**
   * 健康检查响应时间 - 优秀阈值（毫秒）
   */
  @IsNumber({}, { message: '健康检查响应时间优秀阈值必须是数字' })
  @Min(10, { message: '健康检查响应时间优秀阈值最小值为10ms' })
  @Max(500, { message: '健康检查响应时间优秀阈值最大值为500ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 100 : parsed;
  })
  healthCheckExcellentMs: number = 100;

  /**
   * 健康检查响应时间 - 良好阈值（毫秒）
   */
  @IsNumber({}, { message: '健康检查响应时间良好阈值必须是数字' })
  @Min(100, { message: '健康检查响应时间良好阈值最小值为100ms' })
  @Max(1000, { message: '健康检查响应时间良好阈值最大值为1000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  healthCheckGoodMs: number = 300;

  /**
   * 健康检查响应时间 - 一般阈值（毫秒）
   */
  @IsNumber({}, { message: '健康检查响应时间一般阈值必须是数字' })
  @Min(300, { message: '健康检查响应时间一般阈值最小值为300ms' })
  @Max(5000, { message: '健康检查响应时间一般阈值最大值为5000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  healthCheckFairMs: number = 1000;

  /**
   * 健康检查响应时间 - 较差阈值（毫秒）
   */
  @IsNumber({}, { message: '健康检查响应时间较差阈值必须是数字' })
  @Min(1000, { message: '健康检查响应时间较差阈值最小值为1000ms' })
  @Max(10000, { message: '健康检查响应时间较差阈值最大值为10000ms' })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 2000 : parsed;
  })
  healthCheckPoorMs: number = 2000;
}

/**
 * 监控组件统一性能阈值配置主类
 * 🎯 整合所有性能阈值配置
 */
export class MonitoringPerformanceThresholdsConfig {
  /**
   * API响应时间阈值配置
   */
  @Type(() => ApiResponseThresholdsConfig)
  apiResponse: ApiResponseThresholdsConfig = new ApiResponseThresholdsConfig();

  /**
   * 缓存性能阈值配置
   */
  @Type(() => CachePerformanceThresholdsConfig)
  cachePerformance: CachePerformanceThresholdsConfig = new CachePerformanceThresholdsConfig();

  /**
   * 数据库性能阈值配置
   */
  @Type(() => DatabasePerformanceThresholdsConfig)
  databasePerformance: DatabasePerformanceThresholdsConfig = new DatabasePerformanceThresholdsConfig();

  /**
   * 吞吐量和并发阈值配置
   */
  @Type(() => ThroughputConcurrencyThresholdsConfig)
  throughputConcurrency: ThroughputConcurrencyThresholdsConfig = new ThroughputConcurrencyThresholdsConfig();

  /**
   * 系统资源阈值配置
   */
  @Type(() => SystemResourceThresholdsConfig)
  systemResource: SystemResourceThresholdsConfig = new SystemResourceThresholdsConfig();

  /**
   * 错误率和可用性阈值配置
   */
  @Type(() => ErrorRateAvailabilityThresholdsConfig)
  errorRateAvailability: ErrorRateAvailabilityThresholdsConfig = new ErrorRateAvailabilityThresholdsConfig();

  /**
   * 根据环境调整配置
   */
  adjustForEnvironment(): void {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'production':
        // 生产环境：更严格的性能要求
        this.apiResponse.apiExcellentMs = 80;
        this.apiResponse.apiGoodMs = 200;
        this.apiResponse.apiWarningMs = 500;
        
        this.cachePerformance.redisHitRateExcellent = 0.97;
        this.cachePerformance.redisHitRateGood = 0.90;
        this.cachePerformance.redisResponseExcellentMs = 3;
        
        this.databasePerformance.mongoQueryExcellentMs = 30;
        this.databasePerformance.mongoQueryGoodMs = 100;
        
        this.throughputConcurrency.apiThroughputExcellentRps = 2000;
        this.throughputConcurrency.apiThroughputGoodRps = 1000;
        
        this.systemResource.cpuUsageHigh = 0.6;
        this.systemResource.cpuUsageCritical = 0.8;
        this.systemResource.memoryUsageHigh = 0.7;
        this.systemResource.memoryUsageCritical = 0.9;
        
        this.errorRateAvailability.errorRateAcceptable = 0.01;
        this.errorRateAvailability.errorRateWarning = 0.05;
        this.errorRateAvailability.availabilityTarget = 0.9995;
        break;
        
      case 'test':
        // 测试环境：宽松的性能要求，快速反馈
        this.apiResponse.apiExcellentMs = 200;
        this.apiResponse.apiGoodMs = 500;
        this.apiResponse.apiWarningMs = 2000;
        
        this.cachePerformance.redisHitRateExcellent = 0.8;
        this.cachePerformance.redisHitRateGood = 0.6;
        this.cachePerformance.redisResponseExcellentMs = 20;
        
        this.databasePerformance.mongoQueryExcellentMs = 100;
        this.databasePerformance.mongoQueryGoodMs = 500;
        
        this.throughputConcurrency.apiThroughputExcellentRps = 100;
        this.throughputConcurrency.apiThroughputGoodRps = 50;
        
        this.systemResource.cpuUsageHigh = 0.8;
        this.systemResource.cpuUsageCritical = 0.95;
        this.systemResource.memoryUsageHigh = 0.8;
        this.systemResource.memoryUsageCritical = 0.98;
        
        this.errorRateAvailability.errorRateAcceptable = 0.2;
        this.errorRateAvailability.errorRateWarning = 0.5;
        this.errorRateAvailability.availabilityTarget = 0.9;
        break;
        
      default: // development
        // 开发环境：使用默认配置
        break;
    }
  }

  /**
   * 获取阈值级别
   */
  getThresholdLevel(category: string, metric: string, value: number): 'excellent' | 'good' | 'warning' | 'poor' | 'critical' {
    // 这里可以实现具体的阈值判断逻辑
    // 根据category、metric和value返回对应的性能级别
    return 'good'; // 默认返回good
  }

  /**
   * 验证阈值配置的合理性
   */
  validateThresholds(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证API响应时间阈值递增
    if (this.apiResponse.apiExcellentMs >= this.apiResponse.apiGoodMs) {
      errors.push('API响应时间优秀阈值必须小于良好阈值');
    }
    if (this.apiResponse.apiGoodMs >= this.apiResponse.apiWarningMs) {
      errors.push('API响应时间良好阈值必须小于警告阈值');
    }

    // 验证缓存命中率阈值递减
    if (this.cachePerformance.redisHitRateExcellent <= this.cachePerformance.redisHitRateGood) {
      errors.push('Redis缓存命中率优秀阈值必须大于良好阈值');
    }

    // 验证系统资源阈值递增
    if (this.systemResource.cpuUsageLow >= this.systemResource.cpuUsageMedium) {
      errors.push('CPU使用率低阈值必须小于中等阈值');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 监控统一性能阈值配置注册
 * 
 * 用法：
 * ```typescript
 * // 在模块中导入
 * @Module({
 *   imports: [ConfigModule.forFeature(monitoringPerformanceThresholdsConfig)]
 * })
 * 
 * // 在服务中注入
 * constructor(
 *   @Inject('monitoringPerformanceThresholds') 
 *   private readonly thresholdsConfig: MonitoringPerformanceThresholdsConfig
 * ) {}
 * ```
 */
export const monitoringPerformanceThresholdsConfig = registerAs('monitoringPerformanceThresholds', (): MonitoringPerformanceThresholdsConfig => {
  const config = new MonitoringPerformanceThresholdsConfig();
  
  // 应用环境变量覆盖
  const env = process.env;
  
  // API响应时间配置
  if (env.MONITORING_API_RESPONSE_EXCELLENT_MS) {
    const parsed = parseInt(env.MONITORING_API_RESPONSE_EXCELLENT_MS, 10);
    if (!isNaN(parsed)) config.apiResponse.apiExcellentMs = parsed;
  }
  
  if (env.MONITORING_API_RESPONSE_GOOD_MS) {
    const parsed = parseInt(env.MONITORING_API_RESPONSE_GOOD_MS, 10);
    if (!isNaN(parsed)) config.apiResponse.apiGoodMs = parsed;
  }
  
  if (env.MONITORING_API_RESPONSE_WARNING_MS) {
    const parsed = parseInt(env.MONITORING_API_RESPONSE_WARNING_MS, 10);
    if (!isNaN(parsed)) config.apiResponse.apiWarningMs = parsed;
  }

  // 缓存性能配置
  if (env.MONITORING_REDIS_HIT_RATE_EXCELLENT) {
    const parsed = parseFloat(env.MONITORING_REDIS_HIT_RATE_EXCELLENT);
    if (!isNaN(parsed)) config.cachePerformance.redisHitRateExcellent = parsed;
  }
  
  if (env.MONITORING_REDIS_RESPONSE_EXCELLENT_MS) {
    const parsed = parseInt(env.MONITORING_REDIS_RESPONSE_EXCELLENT_MS, 10);
    if (!isNaN(parsed)) config.cachePerformance.redisResponseExcellentMs = parsed;
  }

  // 数据库性能配置
  if (env.MONITORING_MONGO_QUERY_EXCELLENT_MS) {
    const parsed = parseInt(env.MONITORING_MONGO_QUERY_EXCELLENT_MS, 10);
    if (!isNaN(parsed)) config.databasePerformance.mongoQueryExcellentMs = parsed;
  }

  // 吞吐量配置
  if (env.MONITORING_API_THROUGHPUT_EXCELLENT_RPS) {
    const parsed = parseInt(env.MONITORING_API_THROUGHPUT_EXCELLENT_RPS, 10);
    if (!isNaN(parsed)) config.throughputConcurrency.apiThroughputExcellentRps = parsed;
  }

  // 系统资源配置
  if (env.MONITORING_CPU_USAGE_HIGH) {
    const parsed = parseFloat(env.MONITORING_CPU_USAGE_HIGH);
    if (!isNaN(parsed)) config.systemResource.cpuUsageHigh = parsed;
  }

  // 错误率配置
  if (env.MONITORING_ERROR_RATE_ACCEPTABLE) {
    const parsed = parseFloat(env.MONITORING_ERROR_RATE_ACCEPTABLE);
    if (!isNaN(parsed)) config.errorRateAvailability.errorRateAcceptable = parsed;
  }

  // 根据环境调整配置
  config.adjustForEnvironment();

  return config;
});

/**
 * 性能阈值工具类
 * 🛠️ 提供性能阈值的常用工具方法
 */
export class MonitoringPerformanceThresholdsUtils {
  /**
   * 根据响应时间判断性能级别
   */
  static getResponseTimeLevel(
    responseTimeMs: number, 
    type: 'api' | 'websocket' | 'internal' = 'api',
    config: MonitoringPerformanceThresholdsConfig
  ): 'excellent' | 'good' | 'warning' | 'poor' | 'critical' {
    const thresholds = config.apiResponse;
    
    let excellentMs: number, goodMs: number, warningMs: number, poorMs: number;
    
    switch (type) {
      case 'websocket':
        excellentMs = thresholds.websocketExcellentMs;
        goodMs = thresholds.websocketGoodMs;
        warningMs = thresholds.websocketWarningMs;
        poorMs = thresholds.websocketPoorMs;
        break;
      case 'internal':
        excellentMs = thresholds.internalServiceExcellentMs;
        goodMs = thresholds.internalServiceGoodMs;
        warningMs = thresholds.internalServiceWarningMs;
        poorMs = thresholds.internalServicePoorMs;
        break;
      default: // api
        excellentMs = thresholds.apiExcellentMs;
        goodMs = thresholds.apiGoodMs;
        warningMs = thresholds.apiWarningMs;
        poorMs = thresholds.apiPoorMs;
        break;
    }

    if (responseTimeMs <= excellentMs) return 'excellent';
    if (responseTimeMs <= goodMs) return 'good';
    if (responseTimeMs <= warningMs) return 'warning';
    if (responseTimeMs <= poorMs) return 'poor';
    return 'critical';
  }

  /**
   * 根据缓存命中率判断性能级别
   */
  static getCacheHitRateLevel(
    hitRate: number,
    cacheType: 'redis' | 'app' | 'memory' = 'redis',
    config: MonitoringPerformanceThresholdsConfig
  ): 'excellent' | 'good' | 'warning' | 'poor' | 'critical' {
    const cache = config.cachePerformance;
    
    let excellent: number, good: number, warning: number, poor: number;
    
    switch (cacheType) {
      case 'app':
        excellent = cache.appCacheHitRateExcellent;
        good = cache.appCacheHitRateGood;
        warning = cache.appCacheHitRateWarning;
        poor = cache.appCacheHitRatePoor;
        break;
      case 'memory':
        excellent = cache.memoryCacheHitRateExcellent;
        good = cache.memoryCacheHitRateGood;
        warning = cache.memoryCacheHitRateWarning;
        poor = cache.memoryCacheHitRatePoor;
        break;
      default: // redis
        excellent = cache.redisHitRateExcellent;
        good = cache.redisHitRateGood;
        warning = cache.redisHitRateWarning;
        poor = cache.redisHitRatePoor;
        break;
    }

    if (hitRate >= excellent) return 'excellent';
    if (hitRate >= good) return 'good';
    if (hitRate >= warning) return 'warning';
    if (hitRate >= poor) return 'poor';
    return 'critical';
  }

  /**
   * 根据系统资源使用率判断健康级别
   */
  static getSystemResourceLevel(
    usage: number,
    resourceType: 'cpu' | 'memory' | 'disk' | 'connection' | 'fd',
    config: MonitoringPerformanceThresholdsConfig
  ): 'excellent' | 'good' | 'warning' | 'poor' | 'critical' {
    const resource = config.systemResource;
    
    switch (resourceType) {
      case 'cpu':
        if (usage <= resource.cpuUsageLow) return 'excellent';
        if (usage <= resource.cpuUsageMedium) return 'good';
        if (usage <= resource.cpuUsageHigh) return 'warning';
        if (usage <= resource.cpuUsageCritical) return 'poor';
        return 'critical';
        
      case 'memory':
        if (usage <= resource.memoryUsageLow) return 'excellent';
        if (usage <= resource.memoryUsageMedium) return 'good';
        if (usage <= resource.memoryUsageHigh) return 'warning';
        if (usage <= resource.memoryUsageCritical) return 'poor';
        return 'critical';
        
      case 'disk':
        if (usage <= 0.5) return 'excellent';
        if (usage <= 0.7) return 'good';
        if (usage <= resource.diskUsageWarning) return 'warning';
        if (usage <= resource.diskUsageCritical) return 'poor';
        return 'critical';
        
      default:
        return 'good';
    }
  }

  /**
   * 根据错误率判断系统健康级别
   */
  static getErrorRateLevel(
    errorRate: number,
    config: MonitoringPerformanceThresholdsConfig
  ): 'excellent' | 'good' | 'warning' | 'poor' | 'critical' {
    const error = config.errorRateAvailability;
    
    if (errorRate <= error.errorRateAcceptable) return 'excellent';
    if (errorRate <= error.errorRateWarning) return 'good';
    if (errorRate <= error.errorRateCritical) return 'warning';
    if (errorRate <= error.errorRateEmergency) return 'poor';
    return 'critical';
  }

  /**
   * 获取所有阈值的环境变量映射
   */
  static getEnvironmentVariableMapping(): Record<string, string> {
    return {
      // API响应时间
      'apiResponse.apiExcellentMs': 'MONITORING_API_RESPONSE_EXCELLENT_MS',
      'apiResponse.apiGoodMs': 'MONITORING_API_RESPONSE_GOOD_MS',
      'apiResponse.apiWarningMs': 'MONITORING_API_RESPONSE_WARNING_MS',
      'apiResponse.apiPoorMs': 'MONITORING_API_RESPONSE_POOR_MS',
      'apiResponse.apiCriticalMs': 'MONITORING_API_RESPONSE_CRITICAL_MS',
      
      // Redis缓存性能
      'cachePerformance.redisHitRateExcellent': 'MONITORING_REDIS_HIT_RATE_EXCELLENT',
      'cachePerformance.redisHitRateGood': 'MONITORING_REDIS_HIT_RATE_GOOD',
      'cachePerformance.redisResponseExcellentMs': 'MONITORING_REDIS_RESPONSE_EXCELLENT_MS',
      'cachePerformance.redisResponseGoodMs': 'MONITORING_REDIS_RESPONSE_GOOD_MS',
      
      // MongoDB性能
      'databasePerformance.mongoQueryExcellentMs': 'MONITORING_MONGO_QUERY_EXCELLENT_MS',
      'databasePerformance.mongoQueryGoodMs': 'MONITORING_MONGO_QUERY_GOOD_MS',
      'databasePerformance.connectionPoolUsageWarning': 'MONITORING_CONNECTION_POOL_USAGE_WARNING',
      
      // 吞吐量
      'throughputConcurrency.apiThroughputExcellentRps': 'MONITORING_API_THROUGHPUT_EXCELLENT_RPS',
      'throughputConcurrency.apiThroughputGoodRps': 'MONITORING_API_THROUGHPUT_GOOD_RPS',
      'throughputConcurrency.concurrentRequestsExcellent': 'MONITORING_CONCURRENT_REQUESTS_EXCELLENT',
      
      // 系统资源
      'systemResource.cpuUsageHigh': 'MONITORING_CPU_USAGE_HIGH',
      'systemResource.cpuUsageCritical': 'MONITORING_CPU_USAGE_CRITICAL',
      'systemResource.memoryUsageHigh': 'MONITORING_MEMORY_USAGE_HIGH',
      'systemResource.memoryUsageCritical': 'MONITORING_MEMORY_USAGE_CRITICAL',
      'systemResource.diskUsageWarning': 'MONITORING_DISK_USAGE_WARNING',
      'systemResource.diskUsageCritical': 'MONITORING_DISK_USAGE_CRITICAL',
      
      // 错误率
      'errorRateAvailability.errorRateAcceptable': 'MONITORING_ERROR_RATE_ACCEPTABLE',
      'errorRateAvailability.errorRateWarning': 'MONITORING_ERROR_RATE_WARNING',
      'errorRateAvailability.errorRateCritical': 'MONITORING_ERROR_RATE_CRITICAL',
      'errorRateAvailability.availabilityTarget': 'MONITORING_AVAILABILITY_TARGET',
    };
  }
}

/**
 * 监控性能阈值配置类型导出
 */
export type MonitoringPerformanceThresholdsType = MonitoringPerformanceThresholdsConfig;
export type PerformanceLevel = 'excellent' | 'good' | 'warning' | 'poor' | 'critical';
export type ResponseTimeType = 'api' | 'websocket' | 'internal';
export type CacheType = 'redis' | 'app' | 'memory';
export type SystemResourceType = 'cpu' | 'memory' | 'disk' | 'connection' | 'fd';

/**
 * 常量导出（兼容性支持）
 * 📦 为需要常量形式的代码提供兼容性支持
 */
export const MONITORING_PERFORMANCE_THRESHOLDS_CONSTANTS = {
  /** API响应时间阈值（毫秒） */
  API_RESPONSE_TIME: {
    EXCELLENT: 100,
    GOOD: 300,
    WARNING: 1000,
    POOR: 3000,
    CRITICAL: 5000,
  },
  
  /** Redis缓存性能阈值 */
  REDIS_CACHE: {
    HIT_RATE_EXCELLENT: 0.95,
    HIT_RATE_GOOD: 0.85,
    HIT_RATE_WARNING: 0.70,
    HIT_RATE_POOR: 0.50,
    HIT_RATE_CRITICAL: 0.30,
    RESPONSE_EXCELLENT_MS: 5,
    RESPONSE_GOOD_MS: 20,
    RESPONSE_WARNING_MS: 50,
    RESPONSE_POOR_MS: 100,
    RESPONSE_CRITICAL_MS: 500,
  },
  
  /** MongoDB查询时间阈值（毫秒） */
  MONGODB_QUERY_TIME: {
    EXCELLENT: 50,
    GOOD: 200,
    WARNING: 1000,
    POOR: 3000,
    CRITICAL: 10000,
  },
  
  /** 系统资源使用率阈值 */
  SYSTEM_RESOURCE: {
    CPU_USAGE_LOW: 0.3,
    CPU_USAGE_MEDIUM: 0.5,
    CPU_USAGE_HIGH: 0.7,
    CPU_USAGE_CRITICAL: 0.9,
    MEMORY_USAGE_LOW: 0.4,
    MEMORY_USAGE_MEDIUM: 0.6,
    MEMORY_USAGE_HIGH: 0.75,
    MEMORY_USAGE_CRITICAL: 0.95,
  },
  
  /** 错误率阈值 */
  ERROR_RATE: {
    ACCEPTABLE: 0.05,
    WARNING: 0.1,
    CRITICAL: 0.2,
    EMERGENCY: 0.3,
  },
  
  /** 吞吐量阈值 */
  THROUGHPUT: {
    API_EXCELLENT_RPS: 1000,
    API_GOOD_RPS: 500,
    API_WARNING_RPS: 100,
    API_POOR_RPS: 50,
    API_CRITICAL_RPS: 10,
  }
} as const;