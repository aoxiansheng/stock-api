/**
 * 健康状态类型
 */
export type HealthStatus = 'healthy' | 'warning' | 'degraded' | 'unhealthy' | 'operational';

/**
 * 健康状态优先级
 */
export type HealthPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 详细健康报告DTO
 */
export interface DetailedHealthReportDto {
  score: number;
  status: HealthStatus;
  issues: string[];
  recommendations: string[];
  timestamp: string;
  priority?: HealthPriority;
  breakdown?: {
    metric: string;
    value: number;
    threshold: number;
    deduction: number;
    reason: string;
  }[];
}

/**
 * 健康分析服务接口
 * 负责系统健康状态的评估、问题识别和建议生成
 */
export interface IHealthAnalytics {
  /**
   * 获取健康评分
   * @returns 健康评分（0-100）
   */
  getHealthScore(): Promise<number>;

  /**
   * 获取健康状态
   * @param score 健康评分（可选），如果不提供则自动计算
   * @returns 健康状态标签
   */
  getHealthStatus(score?: number): Promise<HealthStatus>;

  /**
   * 获取详细健康报告
   * @returns 详细健康报告，包含评分、状态、问题和建议
   */
  getDetailedHealthReport(): Promise<DetailedHealthReportDto>;

  /**
   * 识别系统问题
   * @param score 健康评分
   * @returns 问题列表
   */
  identifyIssues?(score: number): string[];

  /**
   * 生成优化建议
   * @param issues 问题列表
   * @returns 建议列表
   */
  generateRecommendations?(issues: string[]): string[];

  /**
   * 分类问题优先级
   * @param score 健康评分
   * @returns 优先级标签
   */
  categorizePriority?(score: number): HealthPriority;
}