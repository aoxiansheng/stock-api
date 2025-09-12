import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// 导入Notification相关Schema
import {
  AlertRule,
  AlertRuleSchema,
} from "../../alert/schemas/alert-rule.schema";
import {
  AlertHistory,
  AlertHistorySchema,
} from "../../alert/schemas/alert-history.schema";
// 导入NotificationLog相关Schema
import {
  NotificationLog,
  NotificationLogSchema,
} from "../../notification/schemas/notification-log.schema";

/**
 * 通知域数据库模块
 *
 * 职责：
 * - 统一注册通知告警相关的Schema
 * - 提供告警系统数据模型访问能力
 * - 不包含业务逻辑，只负责数据层
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlertRule.name, schema: AlertRuleSchema },
      { name: AlertHistory.name, schema: AlertHistorySchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class NotificationDatabaseModule {}
