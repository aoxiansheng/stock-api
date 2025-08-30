import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { NoPerformanceMonitoring } from "../infrastructure/decorators/infrastructure-config.decorator";
import {
  ApiStandardResponses,
  ApiSuccessResponse,
  JwtAuthResponses,
  ApiHealthResponse,
} from "../../common/core/decorators/swagger-responses.decorator";

import { Auth, Public } from "../../auth/decorators/auth.decorator";
import { UserRole } from "../../auth/enums/user-role.enum";
import { GetDbPerformanceQueryDto } from "./dto/presenter-query.dto";
import { PresenterService } from "./presenter.service";
import { ExtendedHealthService } from "../health/extended-health.service";

/**
 * 展示层控制器
 * 职责：纯HTTP路由层，只负责请求参数验证、权限控制和响应格式化
 * 所有业务逻辑委托给PresenterService处理
 * 
 * 设计原则：
 * - 最小职责：只处理HTTP相关逻辑
 * - 无业务逻辑：所有业务逻辑委托给PresenterService
 * - 薄控制器：Controller只做路由转发
 * - 响应格式化：依赖全局ResponseInterceptor
 */
@ApiTags("📈 系统状态监控")
@Controller("monitoring")
export class PresenterController {
  constructor(
    private readonly presenterService: PresenterService,
    private readonly extendedHealthService: ExtendedHealthService,
  ) {}

  /**
   * 获取性能分析数据
   */
  @Auth([UserRole.ADMIN])
  @Get("performance")
  @ApiOperation({
    summary: "获取性能分析数据",
    description: "获取系统整体性能分析，包括响应时间、错误率、吞吐量等指标",
  })
  @ApiSuccessResponse({
    description: "性能分析数据获取成功",
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        summary: { type: 'object', description: '性能摘要' },
        healthScore: { type: 'number', description: '健康分数' },
        trends: { type: 'object', description: '趋势分析' },
        endpointMetrics: { type: 'array', description: '端点指标' },
        databaseMetrics: { type: 'object', description: '数据库指标' },
        cacheMetrics: { type: 'object', description: '缓存指标' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getPerformanceAnalysis(
    @Query() query: GetDbPerformanceQueryDto,
  ) {
    return this.presenterService.getPerformanceAnalysis(query);
  }

  /**
   * 获取健康评分
   */
  @Auth([UserRole.ADMIN])
  @Get("health/score")
  @ApiOperation({
    summary: "获取系统健康评分",
    description: "获取系统健康评分数值",
  })
  @ApiSuccessResponse({
    description: "健康评分获取成功",
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 0, maximum: 100 },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getHealthScore() {
    return this.presenterService.getHealthScore();
  }

  /**
   * 获取详细健康报告
   */
  @Auth([UserRole.ADMIN])
  @Get("health/report")
  @ApiOperation({
    summary: "获取详细健康报告",
    description: "获取系统详细健康报告，包括各组件健康状况和建议",
  })
  @ApiSuccessResponse({
    description: "健康报告获取成功",
    schema: {
      type: 'object',
      properties: {
        overall: { type: 'object', description: '整体健康状况' },
        components: { type: 'object', description: '组件健康状况' },
        recommendations: { type: 'array', description: '优化建议' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getHealthReport() {
    return this.presenterService.getHealthReport();
  }

  /**
   * 获取趋势分析
   */
  @Auth([UserRole.ADMIN])
  @Get("trends")
  @ApiOperation({
    summary: "获取趋势分析",
    description: "获取系统性能趋势分析数据",
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: '分析周期 (例如: 1h, 24h, 7d)',
    example: '1h'
  })
  @ApiSuccessResponse({
    description: "趋势分析获取成功",
    schema: {
      type: 'object',
      properties: {
        responseTime: { type: 'object', description: '响应时间趋势' },
        errorRate: { type: 'object', description: '错误率趋势' },
        throughput: { type: 'object', description: '吞吐量趋势' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getTrends(
    @Query('period') period: string = '1h',
  ) {
    return this.presenterService.getTrends(period);
  }

  /**
   * 获取端点指标
   */
  @Auth([UserRole.ADMIN])
  @Get("endpoints")
  @ApiOperation({
    summary: "获取端点性能指标",
    description: "获取API端点的性能指标数据",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回结果数量限制',
    example: 50
  })
  @ApiSuccessResponse({
    description: "端点指标获取成功",
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          endpoint: { type: 'string' },
          method: { type: 'string' },
          requestCount: { type: 'number' },
          averageResponseTime: { type: 'number' },
          errorRate: { type: 'number' },
          lastUsed: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getEndpointMetrics(
    @Query('limit') limit?: string,
  ) {
    return this.presenterService.getEndpointMetrics(limit);
  }

  /**
   * 获取数据库指标
   */
  @Auth([UserRole.ADMIN])
  @Get("database")
  @ApiOperation({
    summary: "获取数据库性能指标",
    description: "获取数据库操作的性能指标数据",
  })
  @ApiSuccessResponse({
    description: "数据库指标获取成功",
    schema: {
      type: 'object',
      properties: {
        totalOperations: { type: 'number' },
        averageQueryTime: { type: 'number' },
        slowQueries: { type: 'number' },
        failedOperations: { type: 'number' },
        failureRate: { type: 'number' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDatabaseMetrics() {
    return this.presenterService.getDatabaseMetrics();
  }

  /**
   * 获取缓存指标
   */
  @Auth([UserRole.ADMIN])
  @Get("cache")
  @ApiOperation({
    summary: "获取缓存性能指标",
    description: "获取缓存操作的性能指标数据",
  })
  @ApiSuccessResponse({
    description: "缓存指标获取成功",
    schema: {
      type: 'object',
      properties: {
        totalOperations: { type: 'number' },
        hits: { type: 'number' },
        misses: { type: 'number' },
        hitRate: { type: 'number' },
        averageResponseTime: { type: 'number' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getCacheMetrics() {
    return this.presenterService.getCacheMetrics();
  }

  /**
   * 获取优化建议
   */
  @Auth([UserRole.ADMIN])
  @Get("suggestions")
  @ApiOperation({
    summary: "获取系统优化建议",
    description: "获取基于当前系统状态的优化建议",
  })
  @ApiSuccessResponse({
    description: "优化建议获取成功",
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['performance', 'security', 'resource', 'optimization'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          title: { type: 'string' },
          description: { type: 'string' },
          action: { type: 'string' },
          impact: { type: 'string' }
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getOptimizationSuggestions() {
    return this.presenterService.getOptimizationSuggestions();
  }

  /**
   * 获取缓存统计
   */
  @Auth([UserRole.ADMIN])
  @Get("cache/stats")
  @ApiOperation({
    summary: "获取缓存统计信息",
    description: "获取分析器缓存的统计信息",
  })
  @ApiSuccessResponse({
    description: "缓存统计获取成功",
    schema: {
      type: 'object',
      properties: {
        hitRate: { type: 'number' },
        totalRequests: { type: 'number' },
        totalHits: { type: 'number' },
        totalMisses: { type: 'number' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getCacheStats() {
    return this.presenterService.getCacheStats();
  }

  /**
   * 获取SmartCache性能统计
   */
  @Auth([UserRole.ADMIN])
  @Get("smart-cache/stats")
  @ApiOperation({
    summary: "获取SmartCache性能统计",
    description: "获取SmartCache性能优化器的详细统计信息，包括并发控制和内存压力数据",
  })
  @ApiSuccessResponse({
    description: "SmartCache统计获取成功",
    schema: {
      type: 'object',
      properties: {
        hitRate: { type: 'number', description: '缓存命中率' },
        totalRequests: { type: 'number', description: '总请求数' },
        smartCache: {
          type: 'object',
          properties: {
            concurrencyAdjustments: { type: 'number', description: '并发调整次数' },
            memoryPressureEvents: { type: 'number', description: '内存压力事件' },
            tasksCleared: { type: 'number', description: '任务清理数量' },
            avgExecutionTime: { type: 'number', description: '平均执行时间(ms)' },
            dynamicMaxConcurrency: { type: 'number', description: '动态最大并发数' },
            originalMaxConcurrency: { type: 'number', description: '原始最大并发数' },
            currentBatchSize: { type: 'number', description: '当前批次大小' }
          }
        },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getSmartCacheStats() {
    return this.presenterService.getSmartCacheStats();
  }

  /**
   * 获取SmartCache优化建议
   */
  @Auth([UserRole.ADMIN])
  @Get("smart-cache/suggestions")
  @ApiOperation({
    summary: "获取SmartCache优化建议",
    description: "基于SmartCache性能数据生成的智能优化建议",
  })
  @ApiSuccessResponse({
    description: "SmartCache优化建议获取成功",
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string', enum: ['memory', 'concurrency', 'performance', 'capacity'] },
          title: { type: 'string' },
          description: { type: 'string' },
          recommendation: { type: 'string' }
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getSmartCacheOptimizationSuggestions() {
    return this.presenterService.getSmartCacheOptimizationSuggestions();
  }

  /**
   * 创建SmartCache监控仪表板
   */
  @Auth([UserRole.ADMIN])
  @HttpCode(HttpStatus.CREATED)
  @Post("smart-cache/dashboard")
  @ApiOperation({
    summary: "创建SmartCache监控仪表板",
    description: "自动创建专门用于SmartCache性能监控的仪表板",
  })
  @ApiSuccessResponse({
    description: "SmartCache仪表板创建成功",
    schema: {
      type: 'object',
      properties: {
        dashboardId: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['created'] },
        timestamp: { type: 'string', format: 'date-time' },
        url: { type: 'string' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async createSmartCacheDashboard() {
    return this.presenterService.createSmartCacheDashboard();
  }

  /**
   * 获取SmartCache分析报告
   */
  @Auth([UserRole.ADMIN])
  @Get("smart-cache/analysis")
  @ApiOperation({
    summary: "获取SmartCache详细分析报告",
    description: "获取全面的SmartCache性能分析报告，包括健康评分、趋势分析和优化建议",
  })
  @ApiSuccessResponse({
    description: "SmartCache分析报告获取成功",
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        healthScore: { type: 'number', minimum: 0, maximum: 100 },
        summary: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor', 'critical'] },
            totalTasks: { type: 'number' },
            avgExecutionTime: { type: 'number' },
            concurrencyOptimization: { type: 'object' },
            memoryManagement: { type: 'object' }
          }
        },
        performance: {
          type: 'object',
          properties: {
            concurrencyMetrics: { type: 'object' },
            memoryMetrics: { type: 'object' },
            systemMetrics: { type: 'object' }
          }
        },
        optimizations: { type: 'array', items: { type: 'object' } },
        recommendations: { type: 'array', items: { type: 'object' } },
        trends: { type: 'object' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getSmartCacheAnalysisReport() {
    return this.presenterService.getSmartCacheAnalysisReport();
  }

  /**
   * 失效缓存
   */
  @Auth([UserRole.ADMIN])
  @HttpCode(HttpStatus.OK)
  @Get("cache/invalidate")
  @ApiOperation({
    summary: "失效分析器缓存",
    description: "手动失效分析器缓存，可指定失效模式",
  })
  @ApiQuery({
    name: 'pattern',
    required: false,
    description: '失效模式 (留空则失效所有缓存)',
    example: 'health_*'
  })
  @ApiSuccessResponse({
    description: "缓存失效成功",
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        pattern: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async invalidateCache(
    @Query('pattern') pattern?: string,
  ) {
    return this.presenterService.invalidateCache(pattern);
  }

  /**
   * 基础健康检查 (公开访问)
   */
  @NoPerformanceMonitoring()
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get("health")
  @ApiOperation({
    summary: "获取系统基础健康状态 (公开访问)",
    description: "获取系统基本健康状态，用于服务可用性检查，限制每分钟60次请求",
  })
  @ApiHealthResponse()
  @ApiStandardResponses()
  async getBasicHealthStatus() {
    return this.presenterService.getBasicHealthStatus();
  }

  /**
   * 完整健康状态检查 (需要管理员权限)
   */
  @Auth([UserRole.ADMIN])
  @Get("health/extended")
  @ApiOperation({
    summary: "获取系统完整健康状态",
    description: "获取系统完整健康状态，包括配置验证、依赖检查、启动状态等详细信息",
  })
  @ApiSuccessResponse({
    description: "完整健康状态获取成功",
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: '系统运行时间(秒)' },
        version: { type: 'string' },
        system: {
          type: 'object',
          properties: {
            nodeVersion: { type: 'string' },
            platform: { type: 'string' },
            architecture: { type: 'string' },
            memory: {
              type: 'object',
              properties: {
                used: { type: 'number' },
                total: { type: 'number' },
                percentage: { type: 'number' }
              }
            },
            cpu: {
              type: 'object',
              properties: {
                usage: { type: 'number' }
              }
            }
          }
        },
        configuration: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            errors: { type: 'array', items: { type: 'string' } },
            warnings: { type: 'array', items: { type: 'string' } },
            validatedAt: { type: 'string', format: 'date-time' }
          }
        },
        dependencies: {
          type: 'object',
          properties: {
            mongodb: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected', 'error'] },
                responseTime: { type: 'number' },
                error: { type: 'string' }
              }
            },
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['connected', 'disconnected', 'error'] },
                responseTime: { type: 'number' },
                error: { type: 'string' }
              }
            },
            externalServices: {
              type: 'object',
              properties: {
                longport: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['available', 'unavailable', 'not_configured'] },
                    error: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        startup: {
          type: 'object',
          properties: {
            lastCheck: { type: 'string', format: 'date-time' },
            success: { type: 'boolean' },
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  success: { type: 'boolean' },
                  duration: { type: 'number' },
                  error: { type: 'string' }
                }
              }
            }
          }
        },
        healthScore: { type: 'number', minimum: 0, maximum: 100 },
        recommendations: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getExtendedHealthStatus() {
    return this.extendedHealthService.getFullHealthStatus();
  }

  /**
   * 配置健康检查
   */
  @Auth([UserRole.ADMIN])
  @Get("health/config")
  @ApiOperation({
    summary: "获取配置健康状态",
    description: "检查系统配置的有效性和完整性",
  })
  @ApiSuccessResponse({
    description: "配置健康状态获取成功",
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
        warnings: { type: 'array', items: { type: 'string' } },
        validatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getConfigHealthStatus() {
    return this.extendedHealthService.getConfigHealthStatus();
  }

  /**
   * 依赖服务健康检查
   */
  @Auth([UserRole.ADMIN])
  @Get("health/dependencies")
  @ApiOperation({
    summary: "获取依赖服务健康状态",
    description: "检查数据库、缓存服务等关键依赖的连接状态",
  })
  @ApiSuccessResponse({
    description: "依赖服务健康状态获取成功",
    schema: {
      type: 'object',
      properties: {
        mongodb: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['connected', 'disconnected', 'error'] },
            responseTime: { type: 'number' },
            error: { type: 'string' }
          }
        },
        redis: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['connected', 'disconnected', 'error'] },
            responseTime: { type: 'number' },
            error: { type: 'string' }
          }
        },
        externalServices: {
          type: 'object',
          properties: {
            longport: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['available', 'unavailable', 'not_configured'] },
                error: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDependenciesHealthStatus() {
    return this.extendedHealthService.getDependenciesHealthStatus();
  }

  /**
   * 启动健康检查
   */
  @Auth([UserRole.ADMIN])
  @HttpCode(HttpStatus.OK)
  @Post("health/startup")
  @ApiOperation({
    summary: "执行启动健康检查",
    description: "手动触发启动健康检查，验证系统各组件的初始化状态",
  })
  @ApiSuccessResponse({
    description: "启动健康检查完成",
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              success: { type: 'boolean' },
              duration: { type: 'number' },
              error: { type: 'string' }
            }
          }
        },
        totalDuration: { type: 'number' },
        validationResult: {
          type: 'object',
          properties: {
            overall: {
              type: 'object',
              properties: {
                isValid: { type: 'boolean' },
                errors: { type: 'array', items: { type: 'string' } },
                warnings: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async performStartupCheck() {
    return this.extendedHealthService.performStartupCheck();
  }

  /**
   * 系统仪表板数据 (聚合多个指标)
   */
  @Auth([UserRole.ADMIN])
  @Get("dashboard")
  @ApiOperation({
    summary: "获取系统仪表板数据",
    description: "获取系统仪表板所需的聚合数据，包括关键指标摘要",
  })
  @ApiSuccessResponse({
    description: "仪表板数据获取成功",
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        healthScore: { type: 'number' },
        performanceSummary: { type: 'object' },
        trendsData: { type: 'object' },
        criticalIssues: { type: 'array' },
        suggestions: { type: 'array' }
      }
    }
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getDashboardData() {
    return this.presenterService.getDashboardData();
  }
}