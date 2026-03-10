import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { validateCronExpression } from "cron";
import { createLogger } from "@common/logging/index";
import { SupportListSyncService } from "./support-list-sync.service";

const DEFAULT_SUPPORT_LIST_SYNC_CRON = CronExpression.EVERY_DAY_AT_2AM;
const schedulerBootstrapLogger = createLogger("SupportListSyncScheduler");

function resolveSupportListSyncCron(rawCron: string | undefined): string {
  const normalizedCron = String(rawCron || "").trim();
  if (!normalizedCron) {
    return DEFAULT_SUPPORT_LIST_SYNC_CRON;
  }

  const validation = validateCronExpression(normalizedCron);
  if (validation.valid) {
    return normalizedCron;
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    throw new Error(
      `SUPPORT_LIST_SYNC_CRON 非法，生产环境禁止回退默认值: ${normalizedCron}`,
    );
  }

  schedulerBootstrapLogger.warn("SUPPORT_LIST_SYNC_CRON 非法，非生产环境回退默认表达式", {
    inputCron: normalizedCron,
    fallbackCron: DEFAULT_SUPPORT_LIST_SYNC_CRON,
    error: validation.error?.message,
    environment: process.env.NODE_ENV || "development",
  });
  return DEFAULT_SUPPORT_LIST_SYNC_CRON;
}

const SUPPORT_LIST_SYNC_CRON = resolveSupportListSyncCron(
  process.env.SUPPORT_LIST_SYNC_CRON,
);

@Injectable()
export class SupportListSyncScheduler {
  private readonly logger = createLogger(SupportListSyncScheduler.name);

  constructor(private readonly supportListSyncService: SupportListSyncService) {}

  @Cron(SUPPORT_LIST_SYNC_CRON)
  async handleDailyRefresh(): Promise<void> {
    this.logger.log("触发 support-list 日常同步任务", {
      cron: SUPPORT_LIST_SYNC_CRON,
    });
    await this.supportListSyncService.refreshAllTypes();
  }
}
