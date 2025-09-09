import { registerAs } from "@nestjs/config";
import { ALERT_CORE_TIMEOUTS } from "../constants";

export const alertConfig = registerAs("alert", () => {
  const parsedInterval =
    process.env.ALERT_EVALUATION_INTERVAL !== undefined
      ? parseInt(process.env.ALERT_EVALUATION_INTERVAL, 10)
      : ALERT_CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.DEFAULT / 1000; // 转换为秒

  return {
    // Configuration for AlertingService - 使用统一时间配置
    evaluationInterval: isNaN(parsedInterval) ? ALERT_CORE_TIMEOUTS.EVALUATION_INTERVALS_MS.DEFAULT / 1000 : parsedInterval,

    // Configuration for RuleEngineService - 引用统一配置
    validation: {
      duration: {
        min: ALERT_CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MIN,
        max: ALERT_CORE_TIMEOUTS.BASIC_SECONDS.DURATION_MAX,
      },
      cooldown: {
        min: ALERT_CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MIN,
        max: ALERT_CORE_TIMEOUTS.BASIC_SECONDS.COOLDOWN_MAX,
      },
    },
    cache: {
      cooldownPrefix: "alert:cooldown:",
      activeAlertPrefix: "active-alert",
      activeAlertTtlSeconds: ALERT_CORE_TIMEOUTS.CACHE_TTL_SECONDS.ALERT,
    },
  };
});
