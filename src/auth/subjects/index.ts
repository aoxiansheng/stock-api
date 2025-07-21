/**
 * 权限主体模块导出
 * 
 * 提供统一的权限主体接口和实现类，
 * 支持JWT用户和API Key两种认证方式的权限验证。
 */

// 接口和类型
export * from '../interfaces/auth-subject.interface';

// 实现类
export * from './jwt-user.subject';
export * from './api-key.subject';

// 工厂类
export * from './auth-subject.factory';
