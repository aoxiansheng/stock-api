/**
 * Global FeatureFlags mock for all unit tests
 * This ensures StreamPerformanceMetrics can instantiate without errors
 */

class MockFeatureFlags {
  constructor() {
    // Cache flags
    this.symbolMappingCacheEnabled = true;
    this.dataTransformCacheEnabled = true;
    
    // Performance flags  
    this.batchProcessingEnabled = true;
    this.objectPoolEnabled = true;
    this.ruleCompilationEnabled = true;
    
    // Logging flags
    this.dynamicLogLevelEnabled = true;
    this.metricsLegacyModeEnabled = true;
    
    // Cache size limits
    this.symbolCacheMaxSize = 2000;
    this.symbolCacheTtl = 5 * 60 * 1000;
    this.ruleCacheMaxSize = 100;
    this.ruleCacheTtl = 10 * 60 * 1000;
    
    // Performance settings
    this.objectPoolSize = 100;
    this.batchSizeThreshold = 10;
    this.batchTimeWindowMs = 1;
  }

  getAllFlags() {
    return {
      symbolMappingCacheEnabled: this.symbolMappingCacheEnabled,
      dataTransformCacheEnabled: this.dataTransformCacheEnabled,
      batchProcessingEnabled: this.batchProcessingEnabled,
      objectPoolEnabled: this.objectPoolEnabled,
      ruleCompilationEnabled: this.ruleCompilationEnabled,
      dynamicLogLevelEnabled: this.dynamicLogLevelEnabled,
      metricsLegacyModeEnabled: this.metricsLegacyModeEnabled,
    };
  }

  isCacheOptimizationEnabled() {
    return true;
  }

  isPerformanceOptimizationEnabled() {
    return true;
  }
}

module.exports = {
  FeatureFlags: MockFeatureFlags
};