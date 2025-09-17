import type { Request } from "express";
import { ApiKeyDocument } from "../schemas/apikey.schema";

/**
 * 认证请求接口
 * 扩展Express Request以包含认证相关的属性
 *
 * @description
 * 在通过认证守卫后，请求对象会被扩展以包含用户或API密钥信息
 * 这个接口提供了类型安全的方式来访问这些属性
 */
export interface AuthenticatedRequest extends Request {
  /**
   * 当前认证的API密钥文档
   * 由ApiKeyAuthGuard设置
   */
  user?: ApiKeyDocument;

  /**
   * API密钥的别名属性
   * 为了更明确的语义，指向同一个ApiKeyDocument
   */
  apiKey?: ApiKeyDocument;
}
