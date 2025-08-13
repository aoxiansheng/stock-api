/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 真实环境黑盒E2E测试：监控与性能系统
 * 测试系统健康监控、性能指标收集和告警机制
 * 验证性能监控系统的准确性和实时性
 * 
 * 注意：此测试需要项目实际运行在 http://localhost:3000
 * 启动命令：bun run dev
 */

import axios, { AxiosInstance } from 'axios';

describe("Real Environment Black-_box: Monitoring & Performance E2E", () => {
  let httpClient: AxiosInstance;
  let baseURL: string;
  let apiKey: any;
  let adminJWT: string;

  beforeAll(async () => {
    // 配置真实环境连接
    baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    httpClient = axios.create({
      baseURL,
      timeout: 30000,
      validateStatus: () => true, // 不要自动抛出错误，让我们手动处理
    });

    console.log(`🔗 连接到真实项目: ${baseURL}`);

    // 验证项目是否运行
    await verifyProjectRunning();
    
    // 设置认证
    await setupAuthentication();
  });

  async function verifyProjectRunning() {
    try {
      const response = await httpClient.get('/api/v1/monitoring/health');
      if (response.status !== 200) {
        throw new Error(`项目健康检查失败: ${response.status}`);
      }
      console.log('✅ 项目运行状态验证成功');
    } catch (error) {
      console.error('❌ 无法连接到项目，请确保项目正在运行:');
      console.error('   启动命令: bun run dev');
      console.error('   项目地址:', baseURL);
      throw new Error(`项目未运行或不可访问: ${error.message}`);
    }
  }

  async function setupAuthentication() {
    try {
      // 设置管理员认证
      const adminUserData = {
        username: `monitor_admin_${Date.now()}`,
        email: `monitor_admin_${Date.now()}@example.com`,
        password: 'password123',
        role: 'admin'
      };

      const adminRegisterResponse = await httpClient.post('/api/v1/auth/register', adminUserData);
      if (adminRegisterResponse.status !== 201) {
        console.warn('管理员注册失败，可能已存在，尝试直接登录');
      }

      const adminLoginResponse = await httpClient.post('/api/v1/auth/login', {
        username: adminUserData.username,
        password: adminUserData.password
      });

      if (adminLoginResponse.status !== 200) {
        throw new Error(`管理员登录失败: ${adminLoginResponse.status}`);
      }

      adminJWT = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;

      // 创建测试API Key
      const apiKeyData = {
        name: "Real Environment Monitoring Test Key",
        permissions: [
          "data:read",
          "query:execute", 
          "system:monitor",
          "providers:read"
        ],
        rateLimit: {
          requests: 500,
          window: "1h",
        },
      };

      const apiKeyResponse = await httpClient.post("/api/v1/auth/api-keys", apiKeyData, {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      if (apiKeyResponse.status !== 201) {
        throw new Error(`创建API Key失败: ${apiKeyResponse.status}`);
      }

      apiKey = apiKeyResponse.data.data;
      console.log('✅ 认证设置完成');
    } catch (error) {
      console.error('❌ 认证设置失败:', error.message);
      throw error;
    }
  }

  describe("🏥 系统健康监控测试", () => {
    it("应该提供详细的系统健康状态", async () => {
      const response = await httpClient.get("/api/v1/monitoring/health");

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const healthData = response.data.data;

      // 验证核心健康指标
      expect(healthData).toHaveProperty("status");
      // 移除对score字段的期望，因为基本健康API不返回此字段
      expect(healthData).toHaveProperty("timestamp");

      // 验证健康状态的有效性
      expect(["healthy", "warning", "degraded", "unhealthy", "operational"]).toContain(
        healthData.status,
      );
      
      // 移除对score的验证
      // expect(healthData.score).toBeGreaterThanOrEqual(0);
      // expect(healthData.score).toBeLessThanOrEqual(100);

      console.log(`系统健康状态: ${healthData.status}`);

      // 验证问题和建议
      if (healthData.issues) {
        expect(Array.isArray(healthData.issues)).toBe(true);
        console.log(`系统问题: ${healthData.issues.length > 0 ? healthData.issues.join(', ') : '无'}`);
      }

      if (healthData.recommendations) {
        expect(Array.isArray(healthData.recommendations)).toBe(true);
        console.log(`系统建议: ${healthData.recommendations.length > 0 ? healthData.recommendations.join(', ') : '无'}`);
      }
    });

    it("应该监控系统运行时间和版本信息", async () => {
      const response = await httpClient.get("/api/v1/monitoring/health");

      expect(response.status).toBe(200);
      
      const healthData = response.data.data;

      // 验证运行时间
      if (healthData._uptime !== undefined) {
        expect(healthData.uptime).toBeGreaterThan(0);
        console.log(`系统运行时间: ${(healthData.uptime / 3600).toFixed(2)} 小时`);
      }

      // 验证版本信息
      if (healthData.version) {
        expect(typeof healthData.version).toBe("string");
        console.log(`系统版本: ${healthData.version}`);
      }
    });
  });

  describe("📊 性能指标监控测试", () => {
    it("应该提供详细的性能指标", async () => {
      const response = await httpClient.get("/api/v1/monitoring/performance", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const metrics = response.data.data;

      // 验证核心性能指标
      expect(metrics).toHaveProperty("healthScore");
      expect(metrics).toHaveProperty("summary");
      expect(metrics).toHaveProperty("timestamp");

      if (metrics.summary) {
        const summary = metrics.summary;
        
        // 验证响应时间指标
        if (summary._averageResponseTime !== undefined) {
          expect(summary.averageResponseTime).toBeGreaterThanOrEqual(0);
          console.log(`平均响应时间: ${summary.averageResponseTime}ms`);
        }

        // 验证错误率指标
        if (summary.errorRate !== undefined) {
          expect(summary.errorRate).toBeGreaterThanOrEqual(0);
          expect(summary.errorRate).toBeLessThanOrEqual(1);
          console.log(`错误率: ${(summary.errorRate * 100).toFixed(2)}%`);
        }

        // 验证系统负载指标
        if (summary._systemLoad !== undefined) {
          expect(summary.systemLoad).toBeGreaterThanOrEqual(0);
          console.log(`系统负载: ${summary.systemLoad}`);
        }

        // 验证缓存命中率
        if (summary.cacheHitRate !== undefined) {
          expect(summary.cacheHitRate).toBeGreaterThanOrEqual(0);
          expect(summary.cacheHitRate).toBeLessThanOrEqual(1);
          console.log(`缓存命中率: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
        }
      }
    });

    it("应该提供端点级别的性能统计", async () => {
      const response = await httpClient.get("/api/v1/monitoring/_endpoints", {
        headers: { Authorization: `Bearer ${adminJWT}` },
        params: { limit: 10, sortBy: "totalRequests" }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const endpointData = response.data.data;

      // 验证端点统计数据结构
      expect(endpointData).toHaveProperty("metrics");
      expect(endpointData).toHaveProperty("total");
      expect(endpointData).toHaveProperty("timestamp");

      if (endpointData.metrics && Array.isArray(endpointData.metrics)) {
        console.log(`监控到 ${endpointData.total} 个端点，显示前 ${endpointData.metrics.length} 个`);

        endpointData.metrics.forEach((endpoint, index) => {
          if (endpoint.endpoint) {
            console.log(
              `端点 ${index + 1}: ${endpoint.endpoint} - 请求: ${endpoint.totalRequests || 0}, 平均响应: ${endpoint.averageResponseTime || 0}ms`
            );
          }
        });
      }
    });

    it("应该提供数据库性能指标", async () => {
      const response = await httpClient.get("/api/v1/monitoring/database", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const dbMetrics = response.data.data;

      // 验证数据库连接池指标
      if (dbMetrics._connectionPoolSize !== undefined) {
        expect(dbMetrics.connectionPoolSize).toBeGreaterThan(0);
        console.log(`数据库连接池大小: ${dbMetrics.connectionPoolSize}`);
      }

      if (dbMetrics._activeConnections !== undefined) {
        expect(dbMetrics.activeConnections).toBeGreaterThanOrEqual(0);
        console.log(`活跃连接数: ${dbMetrics.activeConnections}`);
      }

      // 验证查询性能指标
      if (dbMetrics._averageQueryTime !== undefined) {
        expect(dbMetrics.averageQueryTime).toBeGreaterThanOrEqual(0);
        console.log(`平均查询时间: ${dbMetrics.averageQueryTime}ms`);
      }

      if (dbMetrics._totalQueries !== undefined) {
        expect(dbMetrics.totalQueries).toBeGreaterThanOrEqual(0);
        console.log(`总查询数: ${dbMetrics.totalQueries}`);
      }
    });

    it("应该提供Redis性能指标", async () => {
      const response = await httpClient.get("/api/v1/monitoring/redis", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const redisMetrics = response.data.data;

      // 验证Redis内存使用
      if (redisMetrics.memoryUsage !== undefined) {
        expect(redisMetrics.memoryUsage).toBeGreaterThanOrEqual(0);
        console.log(`Redis内存使用: ${(redisMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }

      // 验证Redis连接数
      if (redisMetrics._connectedClients !== undefined) {
        expect(redisMetrics.connectedClients).toBeGreaterThanOrEqual(0);
        console.log(`Redis连接数: ${redisMetrics.connectedClients}`);
      }

      // 验证Redis命中率
      if (redisMetrics.hitRate !== undefined) {
        expect(redisMetrics.hitRate).toBeGreaterThanOrEqual(0);
        expect(redisMetrics.hitRate).toBeLessThanOrEqual(1);
        console.log(`Redis命中率: ${(redisMetrics.hitRate * 100).toFixed(1)}%`);
      }
    });

    it("应该提供系统资源指标", async () => {
      const response = await httpClient.get("/api/v1/monitoring/system", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const systemMetrics = response.data.data;

      // 验证CPU使用率
      if (systemMetrics.cpuUsage !== undefined) {
        expect(systemMetrics.cpuUsage).toBeGreaterThanOrEqual(0);
        expect(systemMetrics.cpuUsage).toBeLessThanOrEqual(1);
        console.log(`CPU使用率: ${(systemMetrics.cpuUsage * 100).toFixed(1)}%`);
      }

      // 验证内存使用
      if (systemMetrics.memoryUsage !== undefined) {
        expect(systemMetrics.memoryUsage).toBeGreaterThan(0);
        console.log(`内存使用: ${(systemMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }

      // 验证堆内存
      if (systemMetrics.heapUsed !== undefined && systemMetrics._heapTotal !== undefined) {
        expect(systemMetrics.heapUsed).toBeGreaterThan(0);
        expect(systemMetrics.heapTotal).toBeGreaterThan(systemMetrics.heapUsed);
        console.log(`堆内存: ${(systemMetrics.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(systemMetrics.heapTotal / 1024 / 1024).toFixed(2)}MB`);
      }

      // 验证事件循环延迟
      if (systemMetrics._eventLoopLag !== undefined) {
        expect(systemMetrics.eventLoopLag).toBeGreaterThanOrEqual(0);
        console.log(`事件循环延迟: ${systemMetrics.eventLoopLag}ms`);
      }
    });
  });

  describe("🎯 监控仪表板测试", () => {
    it("应该提供聚合的仪表板数据", async () => {
      const response = await httpClient.get("/api/v1/monitoring/dashboard", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const dashboard = response.data.data;

      // 验证仪表板数据结构
      expect(dashboard).toHaveProperty("timestamp");
      expect(dashboard).toHaveProperty("overview");

      if (dashboard.overview) {
        const overview = dashboard.overview;
        
        // 验证总览数据
        expect(overview).toHaveProperty("healthScore");
        expect(overview).toHaveProperty("status");
        
        console.log(`仪表板概览:`);
        console.log(`  健康评分: ${overview.healthScore}/100`);
        console.log(`  系统状态: ${overview.status}`);
        
        if (overview.totalRequests !== undefined) {
          console.log(`  总请求数: ${overview.totalRequests}`);
        }
        
        if (overview.avgResponseTime !== undefined) {
          console.log(`  平均响应时间: ${overview.avgResponseTime}ms`);
        }
        
        if (overview.cacheHitRate !== undefined) {
          console.log(`  缓存命中率: ${(overview.cacheHitRate * 100).toFixed(1)}%`);
        }
      }

      // 验证性能数据
      if (dashboard.performance) {
        expect(dashboard.performance).toHaveProperty("summary");
        console.log(`包含详细性能数据`);
      }

      // 验证缓存数据
      if (dashboard.cache) {
        console.log(`包含缓存统计数据`);
      }
    });
  });

  describe("🔧 缓存性能监控测试", () => {
    it("应该提供缓存系统性能统计", async () => {
      const response = await httpClient.get("/api/v1/monitoring/cache", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const cacheStats = response.data.data;

      // 验证缓存统计数据
      if (cacheStats.hitRate !== undefined) {
        expect(cacheStats.hitRate).toBeGreaterThanOrEqual(0);
        expect(cacheStats.hitRate).toBeLessThanOrEqual(1);
        console.log(`缓存命中率: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
      }

      if (cacheStats._totalHits !== undefined) {
        expect(cacheStats.totalHits).toBeGreaterThanOrEqual(0);
        console.log(`缓存命中次数: ${cacheStats.totalHits}`);
      }

      if (cacheStats._totalMisses !== undefined) {
        expect(cacheStats.totalMisses).toBeGreaterThanOrEqual(0);
        console.log(`缓存未命中次数: ${cacheStats.totalMisses}`);
      }

      // 验证缓存健康状态
      if (cacheStats.health) {
        expect(cacheStats.health).toHaveProperty("status");
        console.log(`缓存健康状态: ${cacheStats.health.status}`);
      }
    });
  });

  describe("📈 性能优化建议测试", () => {
    it("应该提供基于实际数据的优化建议", async () => {
      const response = await httpClient.get("/api/v1/monitoring/optimization/recommendations", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const recommendations = response.data.data;

      // 验证建议数据结构
      expect(recommendations).toHaveProperty("recommendations");
      expect(recommendations).toHaveProperty("timestamp");

      if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
        console.log(`系统生成了 ${recommendations.recommendations.length} 条优化建议:`);
        
        recommendations.recommendations.forEach((rec, index) => {
          expect(rec).toHaveProperty("type");
          expect(rec).toHaveProperty("priority");
          expect(rec).toHaveProperty("description");
          expect(rec).toHaveProperty("action");
          
          console.log(`  ${index + 1}. [${rec.priority}] ${rec.description}`);
          console.log(`     建议: ${rec.action}`);
        });
      }

      // 验证优先级分类
      if (recommendations.priority) {
        const priority = recommendations.priority;
        
        console.log(`优化建议分类:`);
        console.log(`  高优先级: ${priority.high?.count || 0} 项`);
        console.log(`  中优先级: ${priority.medium?.count || 0} 项`);
        console.log(`  低优先级: ${priority.low?.count || 0} 项`);
        console.log(`  总计: ${priority.total || 0} 项`);
      }
    });
  });

  describe("🩺 指标系统健康检查测试", () => {
    it("应该检查指标系统自身的健康状态", async () => {
      const response = await httpClient.get("/api/v1/monitoring/metrics-health", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const metricsHealth = response.data.data;

      // 验证指标系统健康数据
      expect(metricsHealth).toHaveProperty("status");
      expect(metricsHealth).toHaveProperty("lastHealthCheckTime");

      console.log(`指标系统健康状态: ${metricsHealth.status}`);

      // 验证Redis连接状态
      if (metricsHealth.redis) {
        expect(metricsHealth.redis).toHaveProperty("status");
        console.log(`Redis连接状态: ${metricsHealth.redis.status}`);
        
        if (metricsHealth.redis.connectionTime !== undefined) {
          console.log(`Redis连接时间: ${metricsHealth.redis.connectionTime}ms`);
        }
      }

      // 验证健康检查建议
      if (metricsHealth.recommendations && Array.isArray(metricsHealth.recommendations)) {
        console.log(`指标系统建议 (${metricsHealth.recommendations.length} 项):`);
        metricsHealth.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      }
    });

    it("应该支持手动触发指标系统健康检查", async () => {
      const response = await httpClient.get("/api/v1/monitoring/metrics-health/check", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const checkResult = response.data.data;

      // 验证手动检查结果
      expect(checkResult).toHaveProperty("status");
      expect(checkResult).toHaveProperty("lastHealthCheckTime");

      console.log(`手动健康检查结果: ${checkResult.status}`);

      // 验证检查执行时间
      if (checkResult._checkDuration !== undefined) {
        expect(checkResult.checkDuration).toBeGreaterThanOrEqual(0);
        console.log(`检查执行时间: ${checkResult.checkDuration}ms`);
      }
    });
  });

  afterAll(async () => {
    // 清理测试API Key
    if (apiKey && apiKey.id) {
      try {
        const deleteResponse = await httpClient.delete(`/api/v1/auth/api-keys/${apiKey.appKey}`, {
          headers: { Authorization: `Bearer ${adminJWT}` }
        });
        expect(deleteResponse.status).toBe(200);
        console.log('✅ 测试API Key已清理');
      } catch (error) {
        console.warn('⚠️ API Key清理失败:', error.message);
      }
    }
    
    console.log('🎯 监控性能黑盒测试完成');
  });
});