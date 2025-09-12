/**
 * 通知发送器统一导出
 * 🎯 提供所有通知发送器的统一导出入口
 * 
 * @description 从Alert模块迁移的发送器导出文件
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

// 导入所有发送器
import { EmailSender } from './email.sender';
import { WebhookSender } from './webhook.sender';
import { SlackSender } from './slack.sender';
import { DingTalkSender } from './dingtalk.sender';
import { LogSender } from './log.sender';

// 统一导出所有发送器
export {
  EmailSender,
  WebhookSender,
  SlackSender,
  DingTalkSender,
  LogSender,
};

import { NotificationChannelType } from '../../types/notification.types';

/**
 * 发送器类型映射
 * 用于根据渠道类型获取对应的发送器
 */
export const SENDER_TYPE_MAP = {
  [NotificationChannelType.EMAIL]: EmailSender,
  [NotificationChannelType.WEBHOOK]: WebhookSender,
  [NotificationChannelType.SLACK]: SlackSender,
  [NotificationChannelType.DINGTALK]: DingTalkSender,
  [NotificationChannelType.LOG]: LogSender,
} as const;

/**
 * 所有可用的发送器列表
 */
export const ALL_SENDERS = [
  EmailSender,
  WebhookSender,
  SlackSender,
  DingTalkSender,
  LogSender,
] as const;

/**
 * 发送器注册信息
 */
export const SENDER_REGISTRY = [
  {
    type: NotificationChannelType.EMAIL,
    name: '邮件通知',
    description: '通过SMTP发送邮件通知',
    class: EmailSender,
  },
  {
    type: NotificationChannelType.WEBHOOK,
    name: 'Webhook通知',
    description: '通过HTTP POST发送Webhook通知',
    class: WebhookSender,
  },
  {
    type: NotificationChannelType.SLACK,
    name: 'Slack通知',
    description: '发送到Slack频道或用户',
    class: SlackSender,
  },
  {
    type: NotificationChannelType.DINGTALK,
    name: '钉钉通知',
    description: '发送到钉钉群聊机器人',
    class: DingTalkSender,
  },
  {
    type: NotificationChannelType.LOG,
    name: '日志记录',
    description: '将通知记录到系统日志',
    class: LogSender,
  },
] as const;