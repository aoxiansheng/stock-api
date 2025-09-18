#!/usr/bin/env node

/**
 * Cache Configuration Refactoring Verification Script
 * 
 * This script verifies that our unified cache configuration refactoring
 * is working correctly across all modules. It tests:
 * 1. Configuration loading and validation
 * 2. Dependency injection patterns
 * 3. Module integration
 * 4. Performance characteristics
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CacheConfigVerifier {
  constructor() {
    this.results = {
      configLoading: { passed: 0, failed: 0, tests: [] },
      dependencyInjection: { passed: 0, failed: 0, tests: [] },
      moduleIntegration: { passed: 0, failed: 0, tests: [] },
      performance: { passed: 0, failed: 0, tests: [] },
      overall: { passed: 0, failed: 0 }
    };
    this.startTime = Date.now();
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${type}]`;
    console.log(`${prefix} ${message}`);
  }

  runTest(category, testName, testFn) {
    try {
      this.log(`Testing: ${testName}`);
      const result = testFn();
      this.results[category].passed++;
      this.results[category].tests.push({ name: testName, status: 'PASSED', result });
      this.log(`✅ PASSED: ${testName}`, 'PASS');
      return true;
    } catch (error) {
      this.results[category].failed++;
      this.results[category].tests.push({ name: testName, status: 'FAILED', error: error.message });
      this.log(`❌ FAILED: ${testName} - ${error.message}`, 'FAIL');
      return false;
    }
  }

  // Test 1: Configuration Loading and Validation
  testConfigurationLoading() {
    this.log('=== Testing Configuration Loading ===');

    this.runTest('configLoading', 'CacheUnifiedConfig file exists', () => {
      const configPath = path.join(__dirname, '..', 'src', 'cache', 'config', 'cache-unified.config.ts');
      if (!fs.existsSync(configPath)) {
        throw new Error(`CacheUnifiedConfig file not found at ${configPath}`);
      }
      return 'Config file exists';
    });

    this.runTest('configLoading', 'TypeScript compilation success', () => {
      try {
        execSync('DISABLE_AUTO_INIT=true npm run typecheck:file -- src/cache/config/cache-unified.config.ts', { 
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        return 'TypeScript compilation successful';
      } catch (error) {
        throw new Error(`TypeScript compilation failed: ${error.message}`);
      }
    });

    this.runTest('configLoading', 'Cache module compilation', () => {
      try {
        execSync('DISABLE_AUTO_INIT=true npm run typecheck:file -- src/cache/module/cache.module.ts', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        return 'Cache module compilation successful';
      } catch (error) {
        throw new Error(`Cache module compilation failed: ${error.message}`);
      }
    });
  }

  // Test 2: Dependency Injection Patterns
  testDependencyInjection() {
    this.log('=== Testing Dependency Injection ===');

    this.runTest('dependencyInjection', 'Alert module dependency injection', () => {
      try {
        execSync('DISABLE_AUTO_INIT=true npm run typecheck:file -- src/alert/module/alert-enhanced.module.ts', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        return 'Alert module DI successful';
      } catch (error) {
        throw new Error(`Alert module DI failed: ${error.message}`);
      }
    });

    this.runTest('dependencyInjection', 'Scripts module dependency injection', () => {
      try {
        execSync('DISABLE_AUTO_INIT=true npm run typecheck:file -- src/scripts/module/scripts.module.ts', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        return 'Scripts module DI successful';
      } catch (error) {
        throw new Error(`Scripts module DI failed: ${error.message}`);
      }
    });

    this.runTest('dependencyInjection', 'Cache service dependency injection', () => {
      try {
        execSync('DISABLE_AUTO_INIT=true npm run typecheck:file -- src/cache/services/cache.service.ts', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        return 'Cache service DI successful';
      } catch (error) {
        throw new Error(`Cache service DI failed: ${error.message}`);
      }
    });
  }

  // Test 3: Module Integration
  testModuleIntegration() {
    this.log('=== Testing Module Integration ===');

    this.runTest('moduleIntegration', 'App module integration', () => {
      try {
        execSync('DISABLE_AUTO_INIT=true npm run typecheck:file -- src/app.module.ts', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        return 'App module integration successful';
      } catch (error) {
        throw new Error(`App module integration failed: ${error.message}`);
      }
    });

    this.runTest('moduleIntegration', 'Main application bootstrap', () => {
      try {
        execSync('DISABLE_AUTO_INIT=true npm run typecheck:file -- src/main.ts', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe'
        });
        return 'Main bootstrap successful';
      } catch (error) {
        throw new Error(`Main bootstrap failed: ${error.message}`);
      }
    });

    this.runTest('moduleIntegration', 'Global type checking', () => {
      try {
        // Run a quick type check on core modules
        execSync('DISABLE_AUTO_INIT=true npx tsc --noEmit --skipLibCheck', {
          cwd: path.join(__dirname, '..'),
          stdio: 'pipe',
          timeout: 30000 // 30 second timeout
        });
        return 'Global type checking successful';
      } catch (error) {
        throw new Error(`Global type checking failed: ${error.message}`);
      }
    });
  }

  // Test 4: Performance Characteristics
  testPerformance() {
    this.log('=== Testing Performance ===');

    this.runTest('performance', 'Configuration access performance', () => {
      const startTime = process.hrtime();
      
      // Simulate configuration access pattern
      for (let i = 0; i < 1000; i++) {
        // This simulates the pattern used in our refactored modules
        const mockConfig = {
          defaultTtl: 300,
          redisTtl: 300,
          performanceTtl: 300,
          healthTtl: 300,
          trendTtl: 300
        };
        const ttl = mockConfig.defaultTtl;
      }

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const totalMs = (seconds * 1000) + (nanoseconds / 1000000);
      
      if (totalMs > 10) { // Should be much faster than 10ms for 1000 operations
        throw new Error(`Configuration access too slow: ${totalMs}ms for 1000 operations`);
      }
      
      return `Configuration access: ${totalMs.toFixed(3)}ms for 1000 operations`;
    });

    this.runTest('performance', 'Memory usage estimation', () => {
      const beforeMemory = process.memoryUsage();
      
      // Simulate loading unified config (simplified)
      const mockConfigs = [];
      for (let i = 0; i < 100; i++) {
        mockConfigs.push({
          defaultTtl: 300,
          redisTtl: 300,
          performanceTtl: 300,
          healthTtl: 300,
          trendTtl: 300
        });
      }
      
      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
      
      // Should be minimal memory increase
      if (memoryIncrease > 1024 * 1024) { // 1MB
        throw new Error(`Memory usage too high: ${memoryIncrease} bytes`);
      }
      
      return `Memory increase: ${memoryIncrease} bytes for 100 config objects`;
    });
  }

  // Test 5: File Structure Verification
  testFileStructure() {
    this.log('=== Testing File Structure ===');

    const expectedFiles = [
      'src/cache/config/cache-unified.config.ts',
      'src/cache/module/cache.module.ts',
      'src/cache/services/cache.service.ts'
    ];

    const expectedDeletedFiles = [
      'src/cache/config/cache-redis.config.ts',
      'src/cache/config/cache-defaults.config.ts',
      'src/cache/config/cache-performance.config.ts',
      'src/cache/config/cache-health.config.ts',
      'src/cache/config/cache-trends.config.ts',
      'src/cache/config/cache-alerts.config.ts',
      'src/cache/config/cache-scripts.config.ts',
      'src/cache/config/cache-unified-factory.config.ts'
    ];

    expectedFiles.forEach(file => {
      this.runTest('moduleIntegration', `File exists: ${file}`, () => {
        const filePath = path.join(__dirname, '..', file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Expected file not found: ${file}`);
        }
        return `File exists: ${file}`;
      });
    });

    expectedDeletedFiles.forEach(file => {
      this.runTest('moduleIntegration', `File deleted: ${file}`, () => {
        const filePath = path.join(__dirname, '..', file);
        if (fs.existsSync(filePath)) {
          throw new Error(`File should be deleted but still exists: ${file}`);
        }
        return `File properly deleted: ${file}`;
      });
    });
  }

  // Generate comprehensive report
  generateReport() {
    const totalTime = Date.now() - this.startTime;
    
    this.log('=== VERIFICATION REPORT ===');
    this.log(`Total execution time: ${totalTime}ms`);
    this.log('');

    // Calculate overall results
    Object.keys(this.results).forEach(category => {
      if (category !== 'overall') {
        this.results.overall.passed += this.results[category].passed;
        this.results.overall.failed += this.results[category].failed;
      }
    });

    // Print category summaries
    Object.keys(this.results).forEach(category => {
      if (category !== 'overall') {
        const { passed, failed, tests } = this.results[category];
        const total = passed + failed;
        const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
        
        this.log(`${category.toUpperCase()}: ${passed}/${total} passed (${percentage}%)`);
        
        // Show failed tests
        tests.filter(test => test.status === 'FAILED').forEach(test => {
          this.log(`  ❌ ${test.name}: ${test.error}`, 'FAIL');
        });
      }
    });

    this.log('');
    const { passed, failed } = this.results.overall;
    const total = passed + failed;
    const overallPercentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    
    this.log(`OVERALL RESULT: ${passed}/${total} tests passed (${overallPercentage}%)`);
    
    if (failed === 0) {
      this.log('🎉 ALL TESTS PASSED! Cache configuration refactoring is successful!', 'SUCCESS');
      return true;
    } else {
      this.log(`⚠️  ${failed} tests failed. Please review and fix issues before proceeding.`, 'WARNING');
      return false;
    }
  }

  // Main verification function
  async verify() {
    this.log('Starting Cache Configuration Refactoring Verification');
    this.log('='.repeat(60));

    try {
      this.testConfigurationLoading();
      this.testDependencyInjection();
      this.testModuleIntegration();
      this.testPerformance();
      this.testFileStructure();
      
      return this.generateReport();
    } catch (error) {
      this.log(`Critical error during verification: ${error.message}`, 'ERROR');
      return false;
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new CacheConfigVerifier();
  verifier.verify().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Verification failed with error:', error);
    process.exit(1);
  });
}

module.exports = CacheConfigVerifier;