/**
 * 监控组件统一事件配置类
 *
 * 📋 职责边界：
 * ==========================================
 * 本文件统一管理所有监控组件的事件处理配置，消除重复定义：
 *
 * ✅ 统一事件配置源：
 * - 告警频率控制 (冷却时间、频率限制)
 * - 事件处理重试配置 (重试次数、重试间隔)
 * - 事件收集配置 (采集间隔、批量处理)
 * - 事件通知配置 (通知渠道、通知级别)
 * - 事件存储配置 (保留时间、压缩设置)
 * - 告警升级配置 (升级策略、升级阈值)
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
 * - business.ts 中的 ALERT_FREQUENCY 配置
 * - business.ts 中的 DATA_COLLECTION 部分配置
 * - monitoring.config.ts 中的 events 配置部分
 * - 各个常量文件中的告警配置参数
 *
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import {
  IsNumber,
  IsBoolean,
  IsString,
  IsEnum,
  Min,
  Max,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { registerAs } from "@nestjs/config";

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}

/**
 * 事件优先级枚举
 */
export enum EventPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  REALTIME = "realtime",
}

/**
 * 通知渠道枚举
 */
export enum NotificationChannel {
  EMAIL = "email",
  SMS = "sms",
  WEBHOOK = "webhook",
  SLACK = "slack",
  DINGTALK = "dingtalk",
}

/**
 * 告警频率控制配置
 * 🚨 统一管理告警频率限制和冷却时间
 */
export class AlertFrequencyConfig {
  /**
   * 最大告警数量 - 每分钟
   *
   * 用途：限制每分钟最大告警数量，防止告警风暴
   * 业务影响：过低可能遗漏重要告警，过高可能造成告警疲劳
   *
   * 环境推荐值：
   * - 开发环境：10-20次/分钟
   * - 测试环境：5-10次/分钟
   * - 生产环境：3-10次/分钟
   *
   * 环境变量：MONITORING_MAX_ALERTS_PER_MINUTE
   */
  @IsNumber({}, { message: "每分钟最大告警数必须是数字" })
  @Min(1, { message: "每分钟最大告警数最小值为1" })
  @Max(100, { message: "每分钟最大告警数最大值为100" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5 : parsed;
  })
  maxAlertsPerMinute: number = 5;

  /**
   * 最大告警数量 - 每小时
   *
   * 环境变量：MONITORING_MAX_ALERTS_PER_HOUR
   */
  @IsNumber({}, { message: "每小时最大告警数必须是数字" })
  @Min(10, { message: "每小时最大告警数最小值为10" })
  @Max(1000, { message: "每小时最大告警数最大值为1000" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 60 : parsed;
  })
  maxAlertsPerHour: number = 60;

  /**
   * 最大告警数量 - 每天
   *
   * 环境变量：MONITORING_MAX_ALERTS_PER_DAY
   */
  @IsNumber({}, { message: "每天最大告警数必须是数字" })
  @Min(50, { message: "每天最大告警数最小值为50" })
  @Max(10000, { message: "每天最大告警数最大值为10000" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 500 : parsed;
  })
  maxAlertsPerDay: number = 500;

  /**
   * 紧急告警冷却时间（秒）
   *
   * 用途：紧急告警发送后的最小间隔时间
   * 业务影响：影响紧急问题的响应速度
   *
   * 环境变量：MONITORING_ALERT_COOLDOWN_EMERGENCY
   */
  @IsNumber({}, { message: "紧急告警冷却时间必须是数字" })
  @Min(10, { message: "紧急告警冷却时间最小值为10秒" })
  @Max(300, { message: "紧急告警冷却时间最大值为300秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 60 : parsed;
  })
  cooldownEmergencySeconds: number = 60;

  /**
   * 严重告警冷却时间（秒）
   *
   * 环境变量：MONITORING_ALERT_COOLDOWN_CRITICAL
   */
  @IsNumber({}, { message: "严重告警冷却时间必须是数字" })
  @Min(60, { message: "严重告警冷却时间最小值为60秒" })
  @Max(1800, { message: "严重告警冷却时间最大值为1800秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  cooldownCriticalSeconds: number = 300;

  /**
   * 警告告警冷却时间（秒）
   *
   * 环境变量：MONITORING_ALERT_COOLDOWN_WARNING
   */
  @IsNumber({}, { message: "警告告警冷却时间必须是数字" })
  @Min(300, { message: "警告告警冷却时间最小值为300秒" })
  @Max(3600, { message: "警告告警冷却时间最大值为3600秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 900 : parsed;
  })
  cooldownWarningSeconds: number = 900;

  /**
   * 信息告警冷却时间（秒）
   *
   * 环境变量：MONITORING_ALERT_COOLDOWN_INFO
   */
  @IsNumber({}, { message: "信息告警冷却时间必须是数字" })
  @Min(600, { message: "信息告警冷却时间最小值为600秒" })
  @Max(7200, { message: "信息告警冷却时间最大值为7200秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1800 : parsed;
  })
  cooldownInfoSeconds: number = 1800;

  /**
   * 连续触发告警阈值
   *
   * 用途：需要连续触发多少次才发送告警
   * 目的：减少误报，只在问题持续存在时才告警
   *
   * 环境变量：MONITORING_ALERT_CONSECUTIVE_THRESHOLD
   */
  @IsNumber({}, { message: "连续触发告警阈值必须是数字" })
  @Min(1, { message: "连续触发告警阈值最小值为1" })
  @Max(20, { message: "连续触发告警阈值最大值为20" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3 : parsed;
  })
  consecutiveThreshold: number = 3;
}

/**
 * 事件处理重试配置
 * 🔄 统一管理事件处理失败时的重试策略
 */
export class EventRetryConfig {
  /**
   * 最大重试次数
   *
   * 用途：事件处理失败时的最大重试次数
   * 业务影响：影响系统容错性和处理延迟
   *
   * 环境变量：MONITORING_EVENT_MAX_RETRY_ATTEMPTS
   */
  @IsNumber({}, { message: "最大重试次数必须是数字" })
  @Min(0, { message: "最大重试次数最小值为0" })
  @Max(10, { message: "最大重试次数最大值为10" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3 : parsed;
  })
  maxRetryAttempts: number = 3;

  /**
   * 初始重试延迟（毫秒）
   *
   * 用途：第一次重试前的等待时间
   *
   * 环境变量：MONITORING_EVENT_INITIAL_RETRY_DELAY_MS
   */
  @IsNumber({}, { message: "初始重试延迟必须是数字" })
  @Min(100, { message: "初始重试延迟最小值为100毫秒" })
  @Max(30000, { message: "初始重试延迟最大值为30000毫秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  initialRetryDelayMs: number = 1000;

  /**
   * 重试延迟倍数
   *
   * 用途：每次重试延迟递增的倍数（指数退避）
   *
   * 环境变量：MONITORING_EVENT_RETRY_BACKOFF_MULTIPLIER
   */
  @IsNumber({}, { message: "重试延迟倍数必须是数字" })
  @Min(1.0, { message: "重试延迟倍数最小值为1.0" })
  @Max(5.0, { message: "重试延迟倍数最大值为5.0" })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 2.0 : parsed;
  })
  backoffMultiplier: number = 2.0;

  /**
   * 最大重试延迟（毫秒）
   *
   * 用途：重试延迟的上限时间
   *
   * 环境变量：MONITORING_EVENT_MAX_RETRY_DELAY_MS
   */
  @IsNumber({}, { message: "最大重试延迟必须是数字" })
  @Min(5000, { message: "最大重试延迟最小值为5000毫秒" })
  @Max(300000, { message: "最大重试延迟最大值为300000毫秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30000 : parsed;
  })
  maxRetryDelayMs: number = 30000;

  /**
   * 重试超时时间（毫秒）
   *
   * 用途：整个重试过程的超时时间
   *
   * 环境变量：MONITORING_EVENT_RETRY_TIMEOUT_MS
   */
  @IsNumber({}, { message: "重试超时时间必须是数字" })
  @Min(10000, { message: "重试超时时间最小值为10000毫秒" })
  @Max(600000, { message: "重试超时时间最大值为600000毫秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 60000 : parsed;
  })
  retryTimeoutMs: number = 60000;

  /**
   * 是否启用抖动
   *
   * 用途：在重试延迟中添加随机抖动，避免雷群效应
   *
   * 环境变量：MONITORING_EVENT_RETRY_JITTER_ENABLED
   */
  @IsBoolean({ message: "启用抖动必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  jitterEnabled: boolean = true;

  /**
   * 抖动范围（0.0-1.0）
   *
   * 用途：抖动的随机范围，0.1表示±10%的随机延迟
   *
   * 环境变量：MONITORING_EVENT_RETRY_JITTER_RANGE
   */
  @IsNumber({}, { message: "抖动范围必须是数字" })
  @Min(0.0, { message: "抖动范围最小值为0.0" })
  @Max(1.0, { message: "抖动范围最大值为1.0" })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.1 : parsed;
  })
  jitterRange: number = 0.1;
}

/**
 * 事件收集配置
 * 📊 统一管理事件收集的频率和批量处理
 */
export class EventCollectionConfig {
  /**
   * 实时事件收集间隔（秒）
   *
   * 用途：实时事件（如紧急告警）的采集间隔
   *
   * 环境变量：MONITORING_EVENT_REALTIME_INTERVAL_SEC
   */
  @IsNumber({}, { message: "实时事件收集间隔必须是数字" })
  @Min(1, { message: "实时事件收集间隔最小值为1秒" })
  @Max(60, { message: "实时事件收集间隔最大值为60秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  realtimeIntervalSeconds: number = 1;

  /**
   * 高频事件收集间隔（秒）
   *
   * 用途：高频事件（如性能监控）的采集间隔
   *
   * 环境变量：MONITORING_EVENT_HIGH_FREQUENCY_INTERVAL_SEC
   */
  @IsNumber({}, { message: "高频事件收集间隔必须是数字" })
  @Min(5, { message: "高频事件收集间隔最小值为5秒" })
  @Max(300, { message: "高频事件收集间隔最大值为300秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5 : parsed;
  })
  highFrequencyIntervalSeconds: number = 5;

  /**
   * 常规事件收集间隔（秒）
   *
   * 用途：常规事件的采集间隔
   *
   * 环境变量：MONITORING_EVENT_NORMAL_INTERVAL_SEC
   */
  @IsNumber({}, { message: "常规事件收集间隔必须是数字" })
  @Min(30, { message: "常规事件收集间隔最小值为30秒" })
  @Max(3600, { message: "常规事件收集间隔最大值为3600秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30 : parsed;
  })
  normalIntervalSeconds: number = 30;

  /**
   * 低频事件收集间隔（秒）
   *
   * 用途：低频事件（如日常统计）的采集间隔
   *
   * 环境变量：MONITORING_EVENT_LOW_FREQUENCY_INTERVAL_SEC
   */
  @IsNumber({}, { message: "低频事件收集间隔必须是数字" })
  @Min(300, { message: "低频事件收集间隔最小值为300秒" })
  @Max(86400, { message: "低频事件收集间隔最大值为86400秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  lowFrequencyIntervalSeconds: number = 300;

  /**
   * 事件缓冲区大小
   *
   * 用途：事件收集器的最大缓冲区大小
   *
   * 环境变量：MONITORING_EVENT_BUFFER_SIZE
   */
  @IsNumber({}, { message: "事件缓冲区大小必须是数字" })
  @Min(100, { message: "事件缓冲区大小最小值为100" })
  @Max(10000, { message: "事件缓冲区大小最大值为10000" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  bufferSize: number = 1000;

  /**
   * 事件缓冲区刷新间隔（毫秒）
   *
   * 用途：强制刷新缓冲区的时间间隔
   *
   * 环境变量：MONITORING_EVENT_BUFFER_FLUSH_INTERVAL_MS
   */
  @IsNumber({}, { message: "事件缓冲区刷新间隔必须是数字" })
  @Min(1000, { message: "事件缓冲区刷新间隔最小值为1000毫秒" })
  @Max(60000, { message: "事件缓冲区刷新间隔最大值为60000毫秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 5000 : parsed;
  })
  bufferFlushIntervalMs: number = 5000;

  /**
   * 是否启用事件聚合
   *
   * 用途：是否将相似的事件聚合处理
   *
   * 环境变量：MONITORING_EVENT_AGGREGATION_ENABLED
   */
  @IsBoolean({ message: "启用事件聚合必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  aggregationEnabled: boolean = true;

  /**
   * 事件聚合时间窗口（秒）
   *
   * 用途：事件聚合的时间窗口大小
   *
   * 环境变量：MONITORING_EVENT_AGGREGATION_WINDOW_SEC
   */
  @IsNumber({}, { message: "事件聚合时间窗口必须是数字" })
  @Min(10, { message: "事件聚合时间窗口最小值为10秒" })
  @Max(3600, { message: "事件聚合时间窗口最大值为3600秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 60 : parsed;
  })
  aggregationWindowSeconds: number = 60;
}

/**
 * 事件通知配置
 * 📢 统一管理事件通知渠道和策略
 */
export class EventNotificationConfig {
  /**
   * 是否启用邮件通知
   *
   * 环境变量：MONITORING_NOTIFICATION_EMAIL_ENABLED
   */
  @IsBoolean({ message: "启用邮件通知必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  emailEnabled: boolean = true;

  /**
   * 是否启用短信通知
   *
   * 环境变量：MONITORING_NOTIFICATION_SMS_ENABLED
   */
  @IsBoolean({ message: "启用短信通知必须是布尔值" })
  @Transform(({ value }) => value === "true")
  smsEnabled: boolean = false;

  /**
   * 是否启用Webhook通知
   *
   * 环境变量：MONITORING_NOTIFICATION_WEBHOOK_ENABLED
   */
  @IsBoolean({ message: "启用Webhook通知必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  webhookEnabled: boolean = true;

  /**
   * 是否启用Slack通知
   *
   * 环境变量：MONITORING_NOTIFICATION_SLACK_ENABLED
   */
  @IsBoolean({ message: "启用Slack通知必须是布尔值" })
  @Transform(({ value }) => value === "true")
  slackEnabled: boolean = false;

  /**
   * 是否启用钉钉通知
   *
   * 环境变量：MONITORING_NOTIFICATION_DINGTALK_ENABLED
   */
  @IsBoolean({ message: "启用钉钉通知必须是布尔值" })
  @Transform(({ value }) => value === "true")
  dingtalkEnabled: boolean = false;

  /**
   * 通知超时时间（毫秒）
   *
   * 用途：发送通知的超时时间
   *
   * 环境变量：MONITORING_NOTIFICATION_TIMEOUT_MS
   */
  @IsNumber({}, { message: "通知超时时间必须是数字" })
  @Min(1000, { message: "通知超时时间最小值为1000毫秒" })
  @Max(60000, { message: "通知超时时间最大值为60000毫秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10000 : parsed;
  })
  notificationTimeoutMs: number = 10000;

  /**
   * 通知重试次数
   *
   * 用途：通知发送失败时的重试次数
   *
   * 环境变量：MONITORING_NOTIFICATION_RETRY_ATTEMPTS
   */
  @IsNumber({}, { message: "通知重试次数必须是数字" })
  @Min(0, { message: "通知重试次数最小值为0" })
  @Max(5, { message: "通知重试次数最大值为5" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 2 : parsed;
  })
  notificationRetryAttempts: number = 2;

  /**
   * 通知模板缓存时间（秒）
   *
   * 用途：通知模板的缓存时间
   *
   * 环境变量：MONITORING_NOTIFICATION_TEMPLATE_CACHE_SEC
   */
  @IsNumber({}, { message: "通知模板缓存时间必须是数字" })
  @Min(60, { message: "通知模板缓存时间最小值为60秒" })
  @Max(86400, { message: "通知模板缓存时间最大值为86400秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3600 : parsed;
  })
  templateCacheSeconds: number = 3600;

  /**
   * 静默时间开始（小时，0-23）
   *
   * 用途：静默时间段开始时间，此时间段内不发送非紧急通知
   *
   * 环境变量：MONITORING_NOTIFICATION_QUIET_HOURS_START
   */
  @IsNumber({}, { message: "静默时间开始必须是数字" })
  @Min(0, { message: "静默时间开始最小值为0" })
  @Max(23, { message: "静默时间开始最大值为23" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 22 : parsed;
  })
  quietHoursStart: number = 22;

  /**
   * 静默时间结束（小时，0-23）
   *
   * 用途：静默时间段结束时间
   *
   * 环境变量：MONITORING_NOTIFICATION_QUIET_HOURS_END
   */
  @IsNumber({}, { message: "静默时间结束必须是数字" })
  @Min(0, { message: "静默时间结束最小值为0" })
  @Max(23, { message: "静默时间结束最大值为23" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 8 : parsed;
  })
  quietHoursEnd: number = 8;

  /**
   * 是否在静默时间发送紧急通知
   *
   * 环境变量：MONITORING_NOTIFICATION_EMERGENCY_DURING_QUIET
   */
  @IsBoolean({ message: "静默时间紧急通知必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  emergencyDuringQuietHours: boolean = true;
}

/**
 * 事件存储配置
 * 💾 统一管理事件数据的存储和生命周期
 */
export class EventStorageConfig {
  /**
   * 实时事件数据保留时间（小时）
   *
   * 用途：实时事件数据的保留时间
   *
   * 环境变量：MONITORING_EVENT_REALTIME_RETENTION_HOURS
   */
  @IsNumber({}, { message: "实时事件保留时间必须是数字" })
  @Min(1, { message: "实时事件保留时间最小值为1小时" })
  @Max(168, { message: "实时事件保留时间最大值为168小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1 : parsed;
  })
  realtimeRetentionHours: number = 1;

  /**
   * 小时级事件数据保留时间（小时）
   *
   * 用途：小时级聚合事件数据的保留时间
   *
   * 环境变量：MONITORING_EVENT_HOURLY_RETENTION_HOURS
   */
  @IsNumber({}, { message: "小时级事件保留时间必须是数字" })
  @Min(24, { message: "小时级事件保留时间最小值为24小时" })
  @Max(2160, { message: "小时级事件保留时间最大值为2160小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 168 : parsed;
  })
  hourlyRetentionHours: number = 168;

  /**
   * 日级事件数据保留时间（小时）
   *
   * 用途：日级聚合事件数据的保留时间
   *
   * 环境变量：MONITORING_EVENT_DAILY_RETENTION_HOURS
   */
  @IsNumber({}, { message: "日级事件保留时间必须是数字" })
  @Min(168, { message: "日级事件保留时间最小值为168小时" })
  @Max(8760, { message: "日级事件保留时间最大值为8760小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 720 : parsed;
  })
  dailyRetentionHours: number = 720;

  /**
   * 月级事件数据保留时间（小时）
   *
   * 用途：月级聚合事件数据的保留时间
   *
   * 环境变量：MONITORING_EVENT_MONTHLY_RETENTION_HOURS
   */
  @IsNumber({}, { message: "月级事件保留时间必须是数字" })
  @Min(720, { message: "月级事件保留时间最小值为720小时" })
  @Max(87600, { message: "月级事件保留时间最大值为87600小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 8760 : parsed;
  })
  monthlyRetentionHours: number = 8760;

  /**
   * 事件压缩阈值（字节）
   *
   * 用途：事件数据大小超过此阈值时启用压缩存储
   *
   * 环境变量：MONITORING_EVENT_COMPRESSION_THRESHOLD_BYTES
   */
  @IsNumber({}, { message: "事件压缩阈值必须是数字" })
  @Min(512, { message: "事件压缩阈值最小值为512字节" })
  @Max(1048576, { message: "事件压缩阈值最大值为1048576字节" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 2048 : parsed;
  })
  compressionThresholdBytes: number = 2048;

  /**
   * 是否启用事件压缩
   *
   * 环境变量：MONITORING_EVENT_COMPRESSION_ENABLED
   */
  @IsBoolean({ message: "启用事件压缩必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  compressionEnabled: boolean = true;

  /**
   * 事件清理批量大小
   *
   * 用途：批量清理过期事件时的批次大小
   *
   * 环境变量：MONITORING_EVENT_CLEANUP_BATCH_SIZE
   */
  @IsNumber({}, { message: "事件清理批量大小必须是数字" })
  @Min(100, { message: "事件清理批量大小最小值为100" })
  @Max(10000, { message: "事件清理批量大小最大值为10000" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1000 : parsed;
  })
  cleanupBatchSize: number = 1000;

  /**
   * 事件清理执行间隔（小时）
   *
   * 用途：自动清理过期事件的执行间隔
   *
   * 环境变量：MONITORING_EVENT_CLEANUP_INTERVAL_HOURS
   */
  @IsNumber({}, { message: "事件清理间隔必须是数字" })
  @Min(1, { message: "事件清理间隔最小值为1小时" })
  @Max(168, { message: "事件清理间隔最大值为168小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 24 : parsed;
  })
  cleanupIntervalHours: number = 24;
}

/**
 * 告警升级配置
 * 📈 统一管理告警升级策略和规则
 */
export class AlertEscalationConfig {
  /**
   * 是否启用告警升级
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_ENABLED
   */
  @IsBoolean({ message: "启用告警升级必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  escalationEnabled: boolean = true;

  /**
   * 第一级升级时间（分钟）
   *
   * 用途：告警未响应时，多久后升级到第一级
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_LEVEL1_MINUTES
   */
  @IsNumber({}, { message: "第一级升级时间必须是数字" })
  @Min(5, { message: "第一级升级时间最小值为5分钟" })
  @Max(120, { message: "第一级升级时间最大值为120分钟" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 15 : parsed;
  })
  level1EscalationMinutes: number = 15;

  /**
   * 第二级升级时间（分钟）
   *
   * 用途：第一级升级后未响应，多久后升级到第二级
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_LEVEL2_MINUTES
   */
  @IsNumber({}, { message: "第二级升级时间必须是数字" })
  @Min(15, { message: "第二级升级时间最小值为15分钟" })
  @Max(240, { message: "第二级升级时间最大值为240分钟" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30 : parsed;
  })
  level2EscalationMinutes: number = 30;

  /**
   * 第三级升级时间（分钟）
   *
   * 用途：第二级升级后未响应，多久后升级到第三级
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_LEVEL3_MINUTES
   */
  @IsNumber({}, { message: "第三级升级时间必须是数字" })
  @Min(30, { message: "第三级升级时间最小值为30分钟" })
  @Max(480, { message: "第三级升级时间最大值为480分钟" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 60 : parsed;
  })
  level3EscalationMinutes: number = 60;

  /**
   * 最大升级级别
   *
   * 用途：告警升级的最大级别数
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_MAX_LEVELS
   */
  @IsNumber({}, { message: "最大升级级别必须是数字" })
  @Min(1, { message: "最大升级级别最小值为1" })
  @Max(10, { message: "最大升级级别最大值为10" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3 : parsed;
  })
  maxEscalationLevels: number = 3;

  /**
   * 自动解决告警时间（小时）
   *
   * 用途：告警持续多久后自动标记为已解决
   *
   * 环境变量：MONITORING_ALERT_AUTO_RESOLVE_HOURS
   */
  @IsNumber({}, { message: "自动解决告警时间必须是数字" })
  @Min(1, { message: "自动解决告警时间最小值为1小时" })
  @Max(168, { message: "自动解决告警时间最大值为168小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 24 : parsed;
  })
  autoResolveHours: number = 24;

  /**
   * 是否启用工作时间升级
   *
   * 用途：是否只在工作时间内进行告警升级
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_BUSINESS_HOURS_ONLY
   */
  @IsBoolean({ message: "工作时间升级必须是布尔值" })
  @Transform(({ value }) => value === "true")
  businessHoursOnly: boolean = false;

  /**
   * 工作时间开始（小时，0-23）
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_BUSINESS_HOURS_START
   */
  @IsNumber({}, { message: "工作时间开始必须是数字" })
  @Min(0, { message: "工作时间开始最小值为0" })
  @Max(23, { message: "工作时间开始最大值为23" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 9 : parsed;
  })
  businessHoursStart: number = 9;

  /**
   * 工作时间结束（小时，0-23）
   *
   * 环境变量：MONITORING_ALERT_ESCALATION_BUSINESS_HOURS_END
   */
  @IsNumber({}, { message: "工作时间结束必须是数字" })
  @Min(0, { message: "工作时间结束最小值为0" })
  @Max(23, { message: "工作时间结束最大值为23" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 18 : parsed;
  })
  businessHoursEnd: number = 18;
}

/**
 * 监控组件统一事件配置主类
 * 🎯 整合所有事件处理和告警配置
 */
export class MonitoringEventsConfig {
  /**
   * 告警频率控制配置
   */
  @Type(() => AlertFrequencyConfig)
  alertFrequency: AlertFrequencyConfig = new AlertFrequencyConfig();

  /**
   * 事件处理重试配置
   */
  @Type(() => EventRetryConfig)
  eventRetry: EventRetryConfig = new EventRetryConfig();

  /**
   * 事件收集配置
   */
  @Type(() => EventCollectionConfig)
  eventCollection: EventCollectionConfig = new EventCollectionConfig();

  /**
   * 事件通知配置
   */
  @Type(() => EventNotificationConfig)
  eventNotification: EventNotificationConfig = new EventNotificationConfig();

  /**
   * 事件存储配置
   */
  @Type(() => EventStorageConfig)
  eventStorage: EventStorageConfig = new EventStorageConfig();

  /**
   * 告警升级配置
   */
  @Type(() => AlertEscalationConfig)
  alertEscalation: AlertEscalationConfig = new AlertEscalationConfig();

  /**
   * 是否启用自动分析功能
   *
   * 用途：控制是否自动分析监控数据并生成性能洞察报告
   *
   * 环境变量：MONITORING_AUTO_ANALYSIS_ENABLED
   */
  @IsBoolean({ message: "启用自动分析必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  enableAutoAnalysis: boolean = true;

  /**
   * 事件处理并发数
   *
   * 用途：同时处理事件的最大并发数
   *
   * 环境变量：MONITORING_EVENT_PROCESSING_CONCURRENCY
   */
  @IsNumber({}, { message: "事件处理并发数必须是数字" })
  @Min(1, { message: "事件处理并发数最小值为1" })
  @Max(100, { message: "事件处理并发数最大值为100" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  processingConcurrency: number = 10;

  /**
   * 事件队列最大大小
   *
   * 用途：事件处理队列的最大容量
   *
   * 环境变量：MONITORING_EVENT_QUEUE_MAX_SIZE
   */
  @IsNumber({}, { message: "事件队列最大大小必须是数字" })
  @Min(1000, { message: "事件队列最大大小最小值为1000" })
  @Max(100000, { message: "事件队列最大大小最大值为100000" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10000 : parsed;
  })
  maxQueueSize: number = 10000;

  /**
   * 事件处理超时时间（毫秒）
   *
   * 用途：单个事件处理的最大时间
   *
   * 环境变量：MONITORING_EVENT_PROCESSING_TIMEOUT_MS
   */
  @IsNumber({}, { message: "事件处理超时时间必须是数字" })
  @Min(1000, { message: "事件处理超时时间最小值为1000毫秒" })
  @Max(300000, { message: "事件处理超时时间最大值为300000毫秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 30000 : parsed;
  })
  processingTimeoutMs: number = 30000;

  /**
   * 根据环境调整配置
   */
  adjustForEnvironment(): void {
    const env = process.env.NODE_ENV || "development";

    switch (env) {
      case "production":
        // 生产环境：更保守的告警频率，更长的重试间隔
        this.alertFrequency.maxAlertsPerMinute = 3;
        this.alertFrequency.maxAlertsPerHour = 30;
        this.alertFrequency.cooldownEmergencySeconds = 30;
        this.alertFrequency.cooldownCriticalSeconds = 180;
        this.alertFrequency.consecutiveThreshold = 2;

        this.eventRetry.maxRetryAttempts = 5;
        this.eventRetry.initialRetryDelayMs = 2000;
        this.eventRetry.maxRetryDelayMs = 60000;

        this.eventCollection.realtimeIntervalSeconds = 1;
        this.eventCollection.highFrequencyIntervalSeconds = 3;
        this.eventCollection.bufferSize = 2000;

        this.eventNotification.notificationTimeoutMs = 15000;
        this.eventNotification.notificationRetryAttempts = 3;

        this.eventStorage.realtimeRetentionHours = 2;
        this.eventStorage.hourlyRetentionHours = 336; // 14天
        this.eventStorage.dailyRetentionHours = 2160; // 90天

        this.alertEscalation.level1EscalationMinutes = 10;
        this.alertEscalation.level2EscalationMinutes = 20;
        this.alertEscalation.level3EscalationMinutes = 40;

        this.processingConcurrency = 20;
        this.maxQueueSize = 20000;
        break;

      case "test":
        // 测试环境：更高的告警频率，更短的重试间隔，快速处理
        this.alertFrequency.maxAlertsPerMinute = 20;
        this.alertFrequency.maxAlertsPerHour = 200;
        this.alertFrequency.cooldownEmergencySeconds = 5;
        this.alertFrequency.cooldownCriticalSeconds = 30;
        this.alertFrequency.consecutiveThreshold = 1;

        this.eventRetry.maxRetryAttempts = 1;
        this.eventRetry.initialRetryDelayMs = 100;
        this.eventRetry.maxRetryDelayMs = 1000;

        this.eventCollection.realtimeIntervalSeconds = 1;
        this.eventCollection.highFrequencyIntervalSeconds = 2;
        this.eventCollection.bufferSize = 100;

        this.eventNotification.notificationTimeoutMs = 3000;
        this.eventNotification.notificationRetryAttempts = 1;

        this.eventStorage.realtimeRetentionHours = 1;
        this.eventStorage.hourlyRetentionHours = 24;
        this.eventStorage.dailyRetentionHours = 168;

        this.alertEscalation.level1EscalationMinutes = 1;
        this.alertEscalation.level2EscalationMinutes = 2;
        this.alertEscalation.level3EscalationMinutes = 5;

        this.processingConcurrency = 5;
        this.maxQueueSize = 1000;
        this.processingTimeoutMs = 5000;
        break;

      default: // development
        // 开发环境：使用默认配置
        break;
    }
  }

  /**
   * 验证配置的合理性
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证告警频率配置
    if (
      this.alertFrequency.maxAlertsPerMinute * 60 >
      this.alertFrequency.maxAlertsPerHour
    ) {
      errors.push("每分钟最大告警数与每小时最大告警数不一致");
    }

    // 验证冷却时间递增
    if (
      this.alertFrequency.cooldownEmergencySeconds >=
      this.alertFrequency.cooldownCriticalSeconds
    ) {
      errors.push("紧急告警冷却时间应小于严重告警冷却时间");
    }

    // 验证重试配置
    if (
      this.eventRetry.initialRetryDelayMs >= this.eventRetry.maxRetryDelayMs
    ) {
      errors.push("初始重试延迟应小于最大重试延迟");
    }

    // 验证升级时间递增
    if (
      this.alertEscalation.level1EscalationMinutes >=
      this.alertEscalation.level2EscalationMinutes
    ) {
      errors.push("第一级升级时间应小于第二级升级时间");
    }

    // 验证工作时间
    if (
      this.alertEscalation.businessHoursStart >=
      this.alertEscalation.businessHoursEnd
    ) {
      errors.push("工作时间开始应早于工作时间结束");
    }

    // 验证静默时间
    if (
      this.eventNotification.quietHoursStart ===
      this.eventNotification.quietHoursEnd
    ) {
      errors.push("静默时间开始和结束时间不能相同");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取告警冷却时间
   */
  getAlertCooldown(level: AlertLevel): number {
    switch (level) {
      case AlertLevel.EMERGENCY:
        return this.alertFrequency.cooldownEmergencySeconds;
      case AlertLevel.CRITICAL:
        return this.alertFrequency.cooldownCriticalSeconds;
      case AlertLevel.WARNING:
        return this.alertFrequency.cooldownWarningSeconds;
      case AlertLevel.INFO:
        return this.alertFrequency.cooldownInfoSeconds;
      default:
        return this.alertFrequency.cooldownInfoSeconds;
    }
  }

  /**
   * 获取事件收集间隔
   */
  getCollectionInterval(priority: EventPriority): number {
    switch (priority) {
      case EventPriority.REALTIME:
        return this.eventCollection.realtimeIntervalSeconds;
      case EventPriority.HIGH:
        return this.eventCollection.highFrequencyIntervalSeconds;
      case EventPriority.NORMAL:
        return this.eventCollection.normalIntervalSeconds;
      case EventPriority.LOW:
        return this.eventCollection.lowFrequencyIntervalSeconds;
      default:
        return this.eventCollection.normalIntervalSeconds;
    }
  }

  /**
   * 获取事件数据保留时间
   */
  getDataRetention(
    dataType: "realtime" | "hourly" | "daily" | "monthly",
  ): number {
    switch (dataType) {
      case "realtime":
        return this.eventStorage.realtimeRetentionHours;
      case "hourly":
        return this.eventStorage.hourlyRetentionHours;
      case "daily":
        return this.eventStorage.dailyRetentionHours;
      case "monthly":
        return this.eventStorage.monthlyRetentionHours;
      default:
        return this.eventStorage.dailyRetentionHours;
    }
  }

  /**
   * 判断是否可以发送告警
   */
  canSendAlert(
    level: AlertLevel,
    recentAlertCount: number,
    timeWindowMinutes: number = 1,
  ): boolean {
    if (timeWindowMinutes === 1) {
      return recentAlertCount < this.alertFrequency.maxAlertsPerMinute;
    }
    if (timeWindowMinutes === 60) {
      return recentAlertCount < this.alertFrequency.maxAlertsPerHour;
    }
    if (timeWindowMinutes === 1440) {
      // 24 hours
      return recentAlertCount < this.alertFrequency.maxAlertsPerDay;
    }
    return true;
  }

  /**
   * 判断是否在静默时间
   */
  isQuietHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    const start = this.eventNotification.quietHoursStart;
    const end = this.eventNotification.quietHoursEnd;

    if (start < end) {
      // 正常情况：如22:00-08:00，跨夜
      return currentHour >= start || currentHour < end;
    } else {
      // 特殊情况：如08:00-22:00，不跨夜
      return currentHour >= start && currentHour < end;
    }
  }

  /**
   * 判断是否在工作时间
   */
  isBusinessHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // 排除周末
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    return (
      currentHour >= this.alertEscalation.businessHoursStart &&
      currentHour < this.alertEscalation.businessHoursEnd
    );
  }
}

/**
 * 监控统一事件配置注册
 *
 * 用法：
 * ```typescript
 * // 在模块中导入
 * @Module({
 *   imports: [ConfigModule.forFeature(monitoringEventsConfig)]
 * })
 *
 * // 在服务中注入
 * constructor(
 *   @Inject('monitoringEvents')
 *   private readonly eventsConfig: MonitoringEventsConfig
 * ) {}
 * ```
 */
export const monitoringEventsConfig = registerAs(
  "monitoringEvents",
  (): MonitoringEventsConfig => {
    const config = new MonitoringEventsConfig();

    // 应用环境变量覆盖
    const env = process.env;

    // 告警频率配置
    if (env.MONITORING_MAX_ALERTS_PER_MINUTE) {
      const parsed = parseInt(env.MONITORING_MAX_ALERTS_PER_MINUTE, 10);
      if (!isNaN(parsed)) config.alertFrequency.maxAlertsPerMinute = parsed;
    }

    if (env.MONITORING_MAX_ALERTS_PER_HOUR) {
      const parsed = parseInt(env.MONITORING_MAX_ALERTS_PER_HOUR, 10);
      if (!isNaN(parsed)) config.alertFrequency.maxAlertsPerHour = parsed;
    }

    if (env.MONITORING_ALERT_COOLDOWN_EMERGENCY) {
      const parsed = parseInt(env.MONITORING_ALERT_COOLDOWN_EMERGENCY, 10);
      if (!isNaN(parsed))
        config.alertFrequency.cooldownEmergencySeconds = parsed;
    }

    if (env.MONITORING_ALERT_COOLDOWN_CRITICAL) {
      const parsed = parseInt(env.MONITORING_ALERT_COOLDOWN_CRITICAL, 10);
      if (!isNaN(parsed))
        config.alertFrequency.cooldownCriticalSeconds = parsed;
    }

    // 事件重试配置
    if (env.MONITORING_EVENT_MAX_RETRY_ATTEMPTS) {
      const parsed = parseInt(env.MONITORING_EVENT_MAX_RETRY_ATTEMPTS, 10);
      if (!isNaN(parsed)) config.eventRetry.maxRetryAttempts = parsed;
    }

    if (env.MONITORING_EVENT_INITIAL_RETRY_DELAY_MS) {
      const parsed = parseInt(env.MONITORING_EVENT_INITIAL_RETRY_DELAY_MS, 10);
      if (!isNaN(parsed)) config.eventRetry.initialRetryDelayMs = parsed;
    }

    // 事件收集配置
    if (env.MONITORING_EVENT_REALTIME_INTERVAL_SEC) {
      const parsed = parseInt(env.MONITORING_EVENT_REALTIME_INTERVAL_SEC, 10);
      if (!isNaN(parsed))
        config.eventCollection.realtimeIntervalSeconds = parsed;
    }

    if (env.MONITORING_EVENT_BUFFER_SIZE) {
      const parsed = parseInt(env.MONITORING_EVENT_BUFFER_SIZE, 10);
      if (!isNaN(parsed)) config.eventCollection.bufferSize = parsed;
    }

    // 事件通知配置
    if (env.MONITORING_NOTIFICATION_EMAIL_ENABLED) {
      config.eventNotification.emailEnabled =
        env.MONITORING_NOTIFICATION_EMAIL_ENABLED !== "false";
    }

    if (env.MONITORING_NOTIFICATION_SMS_ENABLED) {
      config.eventNotification.smsEnabled =
        env.MONITORING_NOTIFICATION_SMS_ENABLED === "true";
    }

    if (env.MONITORING_NOTIFICATION_TIMEOUT_MS) {
      const parsed = parseInt(env.MONITORING_NOTIFICATION_TIMEOUT_MS, 10);
      if (!isNaN(parsed))
        config.eventNotification.notificationTimeoutMs = parsed;
    }

    // 事件存储配置
    if (env.MONITORING_EVENT_REALTIME_RETENTION_HOURS) {
      const parsed = parseInt(
        env.MONITORING_EVENT_REALTIME_RETENTION_HOURS,
        10,
      );
      if (!isNaN(parsed)) config.eventStorage.realtimeRetentionHours = parsed;
    }

    if (env.MONITORING_EVENT_COMPRESSION_ENABLED) {
      config.eventStorage.compressionEnabled =
        env.MONITORING_EVENT_COMPRESSION_ENABLED !== "false";
    }

    // 告警升级配置
    if (env.MONITORING_ALERT_ESCALATION_ENABLED) {
      config.alertEscalation.escalationEnabled =
        env.MONITORING_ALERT_ESCALATION_ENABLED !== "false";
    }

    if (env.MONITORING_ALERT_ESCALATION_LEVEL1_MINUTES) {
      const parsed = parseInt(
        env.MONITORING_ALERT_ESCALATION_LEVEL1_MINUTES,
        10,
      );
      if (!isNaN(parsed))
        config.alertEscalation.level1EscalationMinutes = parsed;
    }

    // 应用统一核心环境变量配置
    if (env.MONITORING_AUTO_ANALYSIS) {
      config.enableAutoAnalysis = env.MONITORING_AUTO_ANALYSIS !== "false";
    }


    // 根据环境调整配置
    config.adjustForEnvironment();

    return config;
  },
);

/**
 * 事件配置工具类
 * 🛠️ 提供事件配置的常用工具方法
 */
export class MonitoringEventsUtils {
  /**
   * 计算下次重试延迟
   */
  static calculateRetryDelay(
    attempt: number,
    config: EventRetryConfig,
  ): number {
    let delay =
      config.initialRetryDelayMs * Math.pow(config.backoffMultiplier, attempt);
    delay = Math.min(delay, config.maxRetryDelayMs);

    if (config.jitterEnabled) {
      const jitter = delay * config.jitterRange * (Math.random() - 0.5) * 2;
      delay += jitter;
    }

    return Math.max(delay, 0);
  }

  /**
   * 判断事件是否应该聚合
   */
  static shouldAggregateEvent(
    event1: any,
    event2: any,
    config: EventCollectionConfig,
  ): boolean {
    if (!config.aggregationEnabled) {
      return false;
    }

    // 简单的事件聚合判断逻辑
    return (
      event1.type === event2.type &&
      event1.source === event2.source &&
      Math.abs(event1.timestamp - event2.timestamp) <=
        config.aggregationWindowSeconds * 1000
    );
  }

  /**
   * 获取通知渠道列表
   */
  static getEnabledNotificationChannels(
    config: EventNotificationConfig,
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    if (config.emailEnabled) channels.push(NotificationChannel.EMAIL);
    if (config.smsEnabled) channels.push(NotificationChannel.SMS);
    if (config.webhookEnabled) channels.push(NotificationChannel.WEBHOOK);
    if (config.slackEnabled) channels.push(NotificationChannel.SLACK);
    if (config.dingtalkEnabled) channels.push(NotificationChannel.DINGTALK);

    return channels;
  }

  /**
   * 获取告警级别的升级时间
   */
  static getEscalationTime(
    level: number,
    config: AlertEscalationConfig,
  ): number {
    switch (level) {
      case 1:
        return config.level1EscalationMinutes * 60 * 1000; // 转换为毫秒
      case 2:
        return config.level2EscalationMinutes * 60 * 1000;
      case 3:
        return config.level3EscalationMinutes * 60 * 1000;
      default:
        return config.level3EscalationMinutes * 60 * 1000;
    }
  }

  /**
   * 判断是否应该发送通知
   */
  static shouldSendNotification(
    alertLevel: AlertLevel,
    config: MonitoringEventsConfig,
  ): boolean {
    // 紧急告警总是发送
    if (alertLevel === AlertLevel.EMERGENCY) {
      return true;
    }

    // 静默时间内，只发送紧急通知
    if (
      config.isQuietHours() &&
      !config.eventNotification.emergencyDuringQuietHours
    ) {
      return false;
    }

    return true;
  }

  /**
   * 获取所有环境变量映射
   */
  static getEnvironmentVariableMapping(): Record<string, string> {
    return {
      // 告警频率
      "alertFrequency.maxAlertsPerMinute": "MONITORING_MAX_ALERTS_PER_MINUTE",
      "alertFrequency.maxAlertsPerHour": "MONITORING_MAX_ALERTS_PER_HOUR",
      "alertFrequency.maxAlertsPerDay": "MONITORING_MAX_ALERTS_PER_DAY",
      "alertFrequency.cooldownEmergencySeconds":
        "MONITORING_ALERT_COOLDOWN_EMERGENCY",
      "alertFrequency.cooldownCriticalSeconds":
        "MONITORING_ALERT_COOLDOWN_CRITICAL",
      "alertFrequency.cooldownWarningSeconds":
        "MONITORING_ALERT_COOLDOWN_WARNING",
      "alertFrequency.cooldownInfoSeconds": "MONITORING_ALERT_COOLDOWN_INFO",
      "alertFrequency.consecutiveThreshold":
        "MONITORING_ALERT_CONSECUTIVE_THRESHOLD",

      // 事件重试
      "eventRetry.maxRetryAttempts": "MONITORING_EVENT_MAX_RETRY_ATTEMPTS",
      "eventRetry.initialRetryDelayMs":
        "MONITORING_EVENT_INITIAL_RETRY_DELAY_MS",
      "eventRetry.backoffMultiplier":
        "MONITORING_EVENT_RETRY_BACKOFF_MULTIPLIER",
      "eventRetry.maxRetryDelayMs": "MONITORING_EVENT_MAX_RETRY_DELAY_MS",
      "eventRetry.retryTimeoutMs": "MONITORING_EVENT_RETRY_TIMEOUT_MS",
      "eventRetry.jitterEnabled": "MONITORING_EVENT_RETRY_JITTER_ENABLED",

      // 事件收集
      "eventCollection.realtimeIntervalSeconds":
        "MONITORING_EVENT_REALTIME_INTERVAL_SEC",
      "eventCollection.highFrequencyIntervalSeconds":
        "MONITORING_EVENT_HIGH_FREQUENCY_INTERVAL_SEC",
      "eventCollection.normalIntervalSeconds":
        "MONITORING_EVENT_NORMAL_INTERVAL_SEC",
      "eventCollection.lowFrequencyIntervalSeconds":
        "MONITORING_EVENT_LOW_FREQUENCY_INTERVAL_SEC",
      "eventCollection.bufferSize": "MONITORING_EVENT_BUFFER_SIZE",
      "eventCollection.aggregationEnabled":
        "MONITORING_EVENT_AGGREGATION_ENABLED",

      // 事件通知
      "eventNotification.emailEnabled": "MONITORING_NOTIFICATION_EMAIL_ENABLED",
      "eventNotification.smsEnabled": "MONITORING_NOTIFICATION_SMS_ENABLED",
      "eventNotification.webhookEnabled":
        "MONITORING_NOTIFICATION_WEBHOOK_ENABLED",
      "eventNotification.slackEnabled": "MONITORING_NOTIFICATION_SLACK_ENABLED",
      "eventNotification.dingtalkEnabled":
        "MONITORING_NOTIFICATION_DINGTALK_ENABLED",
      "eventNotification.notificationTimeoutMs":
        "MONITORING_NOTIFICATION_TIMEOUT_MS",
      "eventNotification.quietHoursStart":
        "MONITORING_NOTIFICATION_QUIET_HOURS_START",
      "eventNotification.quietHoursEnd":
        "MONITORING_NOTIFICATION_QUIET_HOURS_END",

      // 事件存储
      "eventStorage.realtimeRetentionHours":
        "MONITORING_EVENT_REALTIME_RETENTION_HOURS",
      "eventStorage.hourlyRetentionHours":
        "MONITORING_EVENT_HOURLY_RETENTION_HOURS",
      "eventStorage.dailyRetentionHours":
        "MONITORING_EVENT_DAILY_RETENTION_HOURS",
      "eventStorage.monthlyRetentionHours":
        "MONITORING_EVENT_MONTHLY_RETENTION_HOURS",
      "eventStorage.compressionEnabled": "MONITORING_EVENT_COMPRESSION_ENABLED",
      "eventStorage.cleanupBatchSize": "MONITORING_EVENT_CLEANUP_BATCH_SIZE",

      // 告警升级
      "alertEscalation.escalationEnabled":
        "MONITORING_ALERT_ESCALATION_ENABLED",
      "alertEscalation.level1EscalationMinutes":
        "MONITORING_ALERT_ESCALATION_LEVEL1_MINUTES",
      "alertEscalation.level2EscalationMinutes":
        "MONITORING_ALERT_ESCALATION_LEVEL2_MINUTES",
      "alertEscalation.level3EscalationMinutes":
        "MONITORING_ALERT_ESCALATION_LEVEL3_MINUTES",
      "alertEscalation.autoResolveHours": "MONITORING_ALERT_AUTO_RESOLVE_HOURS",
      "alertEscalation.businessHoursOnly":
        "MONITORING_ALERT_ESCALATION_BUSINESS_HOURS_ONLY",

      // 主要配置
      enableAutoAnalysis: "MONITORING_AUTO_ANALYSIS_ENABLED",
      processingConcurrency: "MONITORING_EVENT_PROCESSING_CONCURRENCY",
      maxQueueSize: "MONITORING_EVENT_QUEUE_MAX_SIZE",
      processingTimeoutMs: "MONITORING_EVENT_PROCESSING_TIMEOUT_MS",
    };
  }
}

/**
 * 监控事件配置类型导出
 */
export type MonitoringEventsType = MonitoringEventsConfig;
export type DataRetentionType = "realtime" | "hourly" | "daily" | "monthly";

