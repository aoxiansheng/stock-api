import { registerAs } from "@nestjs/config";
import { TIMING_CONSTANTS } from "../constants/timing.constants";

export const alertConfig = registerAs("alert", () => {
  const parsedInterval =
    process.env.ALERT_EVALUATION_INTERVAL !== undefined
      ? parseInt(process.env.ALERT_EVALUATION_INTERVAL, 10)
      : TIMING_CONSTANTS.EVALUATION.DEFAULT_INTERVAL_MS / 1000; // 转换为秒

  return {
    // Configuration for AlertingService - 使用统一时间配置
    evaluationInterval: isNaN(parsedInterval) ? TIMING_CONSTANTS.EVALUATION.DEFAULT_INTERVAL_MS / 1000 : parsedInterval,

    // Configuration for RuleEngineService - 引用统一配置
    validation: {
      duration: {
        min: TIMING_CONSTANTS.DURATION.MIN_SECONDS,
        max: TIMING_CONSTANTS.DURATION.MAX_SECONDS,
      },
      cooldown: {
        min: TIMING_CONSTANTS.COOLDOWN.MIN_SECONDS,
        max: TIMING_CONSTANTS.COOLDOWN.MAX_SECONDS,
      },
    },
    cache: {
      cooldownPrefix: "alert:cooldown:",
      activeAlertPrefix: "active-alert",
      activeAlertTtlSeconds: TIMING_CONSTANTS.CACHE_TTL.ALERT_SECONDS,
    },
  };
});
