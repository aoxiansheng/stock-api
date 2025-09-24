/**
 * 流缓存迁移验证测试
 * 验证StreamCacheStandardizedService包含所有必需功能
 */

describe('StreamCache Migration Validation', () => {
  it('✅ StreamCacheStandardizedService包含所有移植功能', async () => {
    // 动态导入服务类
    const { StreamCacheStandardizedService } = await import(
      '../../../../src/core/05-caching/module/stream-cache/services/stream-cache-standardized.service'
    );

    const serviceInstance = StreamCacheStandardizedService.prototype;

    // 验证4个关键移植功能存在
    expect(typeof serviceInstance.reportSystemMetrics).toBe('function');
    expect(typeof serviceInstance.getHealthStatus).toBe('function');

    // 验证私有方法通过反射存在
    const privateMethodsExist = [
      'getBatchWithPipeline',
      'fallbackToSingleGets',
      'emitSystemEvent',
    ].every(methodName =>
      serviceInstance.constructor.toString().includes(methodName) ||
      Object.getOwnPropertyNames(serviceInstance).includes(methodName) ||
      serviceInstance[methodName] !== undefined
    );

    expect(privateMethodsExist).toBe(true);

    // 验证接口兼容性
    expect(typeof serviceInstance.getData).toBe('function');
    expect(typeof serviceInstance.setData).toBe('function');
    expect(typeof serviceInstance.getBatchData).toBe('function');
    expect(typeof serviceInstance.getDataSince).toBe('function');
    expect(typeof serviceInstance.deleteData).toBe('function');
    expect(typeof serviceInstance.clearAll).toBe('function');

    // 验证StandardCacheModuleInterface实现
    expect(typeof serviceInstance.get).toBe('function');
    expect(typeof serviceInstance.set).toBe('function');
    expect(typeof serviceInstance.delete).toBe('function');
    expect(typeof serviceInstance.exists).toBe('function');
    expect(typeof serviceInstance.ttl).toBe('function');
    expect(typeof serviceInstance.expire).toBe('function');

    // 验证监控功能
    expect(typeof serviceInstance.getPerformanceMetrics).toBe('function');
    expect(typeof serviceInstance.getHealth).toBe('function');
    expect(typeof serviceInstance.runDiagnostics).toBe('function');
    expect(typeof serviceInstance.attemptSelfHealing).toBe('function');
  });

  it('✅ 依赖注入更新验证', async () => {
    // 验证stream-data-fetcher.service.ts更新
    const fetcherSource = await import(
      '../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service'
    ).then(module => module.StreamDataFetcherService.toString());

    expect(fetcherSource).toContain('StreamCacheStandardizedService');
    expect(fetcherSource).not.toContain('StreamCacheService');

    // 验证stream-recovery-worker.service.ts更新
    const workerSource = await import(
      '../../../../src/core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service'
    ).then(module => module.StreamRecoveryWorkerService.toString());

    expect(workerSource).toContain('StreamCacheStandardizedService');
    expect(workerSource).not.toContain('StreamCacheService');
  });

  it('✅ 模块配置验证', async () => {
    // 验证StreamCacheModule同时导出两个服务
    const { StreamCacheModule } = await import(
      '../../../../src/core/05-caching/module/stream-cache/module/stream-cache.module'
    );

    const moduleSource = StreamCacheModule.toString();

    // 验证两个服务都在providers中注册
    expect(moduleSource).toContain('StreamCacheService');
    expect(moduleSource).toContain('StreamCacheStandardizedService');
  });
});