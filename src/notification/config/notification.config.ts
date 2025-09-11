/**
 * 集中化的通知配置
 */
import { DEFAULT_TEXT_TEMPLATE, DEFAULT_EMAIL_SUBJECT_TEMPLATE } from '../constants/notification.constants';

export const notificationConfig = {
  // 默认的通知模板
  defaultTemplate: DEFAULT_TEXT_TEMPLATE,

  // 邮件主题模板
  emailSubjectTemplate: DEFAULT_EMAIL_SUBJECT_TEMPLATE,
}; 