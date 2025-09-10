/**
 * 通知模块Schema统一导出
 * 🎯 提供通知模块所有Schema的统一导出入口
 * 
 * @description 从Alert模块迁移的通知相关Schema导出文件
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

export { 
  NotificationChannel, 
  NotificationChannelDocument, 
  NotificationChannelSchema 
} from "./notification-channel.schema";

export { 
  NotificationInstance, 
  NotificationDocument, 
  NotificationSchema 
} from "./notification.schema";