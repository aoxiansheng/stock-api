import { registerAs } from "@nestjs/config";
import { ALERT_QUICK_ACCESS } from "../constants";

export const alertConfig = registerAs("alert", () => {
  const parsedInterval =
    process.env.ALERT_EVALUATION_INTERVAL !== undefined
      ? parseInt(process.env.ALERT_EVALUATION_INTERVAL, 10)
      : ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE; // 直接使用秒数

  return {
    // Configuration for AlertingService - 使用新的统一时间配置
    evaluationInterval: isNaN(parsedInterval) ? ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE : parsedInterval,

    // Configuration for RuleEngineService - 使用新的常量系统
    validation: {
      duration: {
        min: ALERT_QUICK_ACCESS.TIME.NORMAL_RESPONSE,           // 30秒
        max: ALERT_QUICK_ACCESS.TIME.EVALUATION_CYCLE * 10,     // 600秒
      },
      cooldown: {
        min: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD,           // 300秒
        max: ALERT_QUICK_ACCESS.TIME.COOLDOWN_PERIOD * 10,      // 3000秒
      },
    },
    cache: {
      cooldownPrefix: "alert:cooldown:",
      activeAlertPrefix: "active-alert", 
      activeAlertTtlSeconds: ALERT_QUICK_ACCESS.TIME.CONFIG_CACHE_TTL, // 1800秒
    },
  };
});
