import { registerAs } from "@nestjs/config";

export const alertConfig = registerAs("alert", () => {
  const parsedInterval =
    process.env.ALERT_EVALUATION_INTERVAL !== undefined
      ? parseInt(process.env.ALERT_EVALUATION_INTERVAL, 10)
      : 60; // 60秒 - 默认评估周期

  return {
    // Configuration for AlertEvaluationService - 评估间隔配置
    evaluationInterval: isNaN(parsedInterval) ? 60 : parsedInterval, // 60秒 - 默认评估周期

    // Configuration for AlertRuleService - 规则验证配置
    validation: {
      duration: {
        min: 30,                      // 30秒 - 最小持续时间
        max: 600,                     // 600秒 - 最大持续时间 (60 * 10)
      },
      cooldown: {
        min: 300,                     // 300秒 - 最小冷却期
        max: 3000,                    // 3000秒 - 最大冷却期 (300 * 10)
      },
    },
    cache: {
      cooldownPrefix: "alert:cooldown:",
      activeAlertPrefix: "active-alert", 
      activeAlertTtlSeconds: 1800,    // 1800秒 - 缓存TTL (30分钟)
    },
  };
});
