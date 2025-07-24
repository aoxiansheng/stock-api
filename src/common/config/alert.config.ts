import { registerAs } from "@nestjs/config";

export const alertConfig = registerAs("alert", () => {
  const parsedInterval = process.env.ALERT_EVALUATION_INTERVAL !== undefined 
    ? parseInt(process.env.ALERT_EVALUATION_INTERVAL, 10) 
    : 60;
    
  return {
    // Configuration for AlertingService
    evaluationInterval: isNaN(parsedInterval) ? NaN : parsedInterval,

    // Configuration for RuleEngineService
    validation: {
      duration: {
        min: 1, // 1 second
        max: 3600, // 1 hour
      },
      cooldown: {
        min: 0,
        max: 86400, // 24 hours
      },
    },
    cache: {
      cooldownPrefix: "alert:cooldown:",
      activeAlertPrefix: "active-alert",
      activeAlertTtlSeconds: 24 * 60 * 60, // 24 hours
    },
  };
});
