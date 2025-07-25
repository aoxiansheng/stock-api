Run bun run lint
$ bun eslint "{src,test}/**/*.ts" --fix

/home/runner/work/stock-api/stock-api/test/config/e2e.global-setup.ts
  31:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  45:16  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  46:18  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

/home/runner/work/stock-api/stock-api/test/config/e2e.global-teardown.ts
  11:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  27:21  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  40:16  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  41:18  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

/home/runner/work/stock-api/stock-api/test/config/e2e.setup.ts
   10:10  error  'Connection' is defined but never used   @typescript-eslint/no-unused-vars
  126:22  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  251:14  error  'error' is defined but never used        @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/config/integration.setup.ts
    9:10  error  'Connection' is defined but never used                                                                               @typescript-eslint/no-unused-vars
   58:10  error  'createMockPerformanceMonitor' is defined but never used                                                             @typescript-eslint/no-unused-vars
  135:9   error  '_success' is defined but never used                                                                                 @typescript-eslint/no-unused-vars
  194:29  error  A `require()` style import is forbidden                                                                              @typescript-eslint/no-require-imports
  215:28  error  A `require()` style import is forbidden                                                                              @typescript-eslint/no-require-imports
  297:28  error  A `require()` style import is forbidden                                                                              @typescript-eslint/no-require-imports
  596:30  error  A `require()` style import is forbidden                                                                              @typescript-eslint/no-require-imports
  679:5   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  681:7   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  692:7   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  709:30  error  A `require()` style import is forbidden                                                                              @typescript-eslint/no-require-imports

/home/runner/work/stock-api/stock-api/test/config/security.setup.ts
   16:3   error  'getLogLevels' is defined but never used         @typescript-eslint/no-unused-vars
   26:10  error  'AuthService' is defined but never used          @typescript-eslint/no-unused-vars
  156:22  error  A `require()` style import is forbidden          @typescript-eslint/no-require-imports
  211:26  error  A `require()` style import is forbidden          @typescript-eslint/no-require-imports
  421:3   error  'timeWindow' is assigned a value but never used  @typescript-eslint/no-unused-vars
  518:27  error  A `require()` style import is forbidden          @typescript-eslint/no-require-imports
  538:15  error  A `require()` style import is forbidden          @typescript-eslint/no-require-imports

/home/runner/work/stock-api/stock-api/test/jest/e2e/alert/comprehensive-alerts.e2e.test.ts
  1:13  error  'request' is defined but never used              @typescript-eslint/no-unused-vars
  5:7   error  'authTokens' is assigned a value but never used  @typescript-eslint/no-unused-vars
  6:7   error  'testUser' is assigned a value but never used    @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/auth/auth-flow.e2e.test.ts
  7:7  error  'app' is assigned a value but never used       @typescript-eslint/no-unused-vars
  9:7  error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/cache/cache-operations.e2e.test.ts
    1:13  error  'request' is defined but never used                 @typescript-eslint/no-unused-vars
    6:7   error  'testUser' is assigned a value but never used       @typescript-eslint/no-unused-vars
  135:13  error  'storeResponse' is assigned a value but never used  @typescript-eslint/no-unused-vars
  190:13  error  'storeResponse' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/common/error-handling-flow.e2e.test.ts
  4:3  error  'HttpException' is defined but never used  @typescript-eslint/no-unused-vars
  5:3  error  'HttpStatus' is defined but never used     @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/common/response-formatting.e2e.test.ts
    1:13  error  'request' is defined but never used                  @typescript-eslint/no-unused-vars
    6:7   error  'developerToken' is assigned a value but never used  @typescript-eslint/no-unused-vars
   15:11  error  'adminUser' is assigned a value but never used       @typescript-eslint/no-unused-vars
   22:11  error  'developerUser' is assigned a value but never used   @typescript-eslint/no-unused-vars
  350:13  error  'ruleId' is assigned a value but never used          @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/core/complete-data-flow.e2e.test.ts
    1:13  error  'request' is defined but never used            @typescript-eslint/no-unused-vars
    6:7   error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars
  252:13  error  'result' is assigned a value but never used    @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/core/cross-module-integration.e2e.test.ts
  1:13  error  'request' is defined but never used            @typescript-eslint/no-unused-vars
  6:7   error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/core/data-mapper.e2e.test.ts
  1:13  error  'request' is defined but never used            @typescript-eslint/no-unused-vars
  6:7   error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/core/error-handling.e2e.test.ts
  1:13  error  'request' is defined but never used            @typescript-eslint/no-unused-vars
  6:7   error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/core/query.e2e.test.ts
  1:13  error  'request' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/core/storage.e2e.test.ts
  1:13  error  'request' is defined but never used            @typescript-eslint/no-unused-vars
  6:7   error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/core/symbol-mapper.e2e.test.ts
  1:13  error  'request' is defined but never used            @typescript-eslint/no-unused-vars
  6:7   error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/metrics/performance-metrics.e2e.test.ts
  1:13  error  'request' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/monitoring/comprehensive-monitoring.e2e.test.ts
  1:13  error  'request' is defined but never used            @typescript-eslint/no-unused-vars
  6:7   error  'testUser' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/monitoring/health-checks.e2e.test.ts
  118:33  error  'otherResponses' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/monitoring/metrics-health.e2e.test.ts
   30:11  error  'registerResponse' is assigned a value but never used  @typescript-eslint/no-unused-vars
   50:14  error  'error' is defined but never used                      @typescript-eslint/no-unused-vars
   61:16  error  'error' is defined but never used                      @typescript-eslint/no-unused-vars
  268:16  error  'error' is defined but never used                      @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/e2e/monitoring/monitoring-dashboard.e2e.test.ts
  6:10  error  'AlertHistoryService' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/alert/alert-cache.integration.test.ts
   23:7   error  'notificationService' is assigned a value but never used  @typescript-eslint/no-unused-vars
   24:7   error  'ruleEngineService' is assigned a value but never used    @typescript-eslint/no-unused-vars
  120:13  error  'updatedRule' is assigned a value but never used          @typescript-eslint/no-unused-vars
  209:13  error  'historyEntry' is assigned a value but never used         @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/auth/auth-database.integration.test.ts
  81:13  error  'loginResult' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/auth/enhanced-auth.integration.test.ts
    4:17  error  A `require()` style import is forbidden                @typescript-eslint/no-require-imports
  277:9   error  'testUser' is assigned a value but never used          @typescript-eslint/no-unused-vars
  291:13  error  'registerResponse' is assigned a value but never used  @typescript-eslint/no-unused-vars
  478:9   error  'testUser' is assigned a value but never used          @typescript-eslint/no-unused-vars
  479:9   error  'userToken' is assigned a value but never used         @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/cache/cache-fault-tolerance.integration.test.ts
   29:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
   39:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
   98:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  107:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  190:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  202:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  231:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  250:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  285:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/common/logger-config.integration.test.ts
   6:28  error  'ValidationPipe' is defined but never used         @typescript-eslint/no-unused-vars
   7:10  error  'Test' is defined but never used                   @typescript-eslint/no-unused-vars
   7:16  error  'TestingModule' is defined but never used          @typescript-eslint/no-unused-vars
  18:10  error  'AppModule' is defined but never used              @typescript-eslint/no-unused-vars
  19:10  error  'GlobalExceptionFilter' is defined but never used  @typescript-eslint/no-unused-vars
  20:10  error  'ResponseInterceptor' is defined but never used    @typescript-eslint/no-unused-vars
  39:14  error  'error' is defined but never used                  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/common/response-format.integration.test.ts
   62:31  error  A `require()` style import is forbidden      @typescript-eslint/no-require-imports
  114:11  error  'userId' is assigned a value but never used  @typescript-eslint/no-unused-vars
  580:36  error  'index' is defined but never used            @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/core/core-modules.integration.test.ts
     9:17  error  A `require()` style import is forbidden                   @typescript-eslint/no-require-imports
    29:7   error  'receiverService' is assigned a value but never used      @typescript-eslint/no-unused-vars
    30:7   error  'symbolMapperService' is assigned a value but never used  @typescript-eslint/no-unused-vars
   771:9   error  'mockFetchSingleData' is assigned a value but never used  @typescript-eslint/no-unused-vars
   779:11  error  A `require()` style import is forbidden                   @typescript-eslint/no-require-imports
  1076:40  error  'capabilityName' is defined but never used                @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/cross-module/cross-module-collaboration.integration.test.ts
   19:3   error  'AlertStatus' is defined but never used                      @typescript-eslint/no-unused-vars
   56:10  error  'isCachedThreat' is defined but never used                   @typescript-eslint/no-unused-vars
   60:10  error  'isCachedSystemStatus' is defined but never used             @typescript-eslint/no-unused-vars
  107:9   error  'flushSecurityAuditLogs' is assigned a value but never used  @typescript-eslint/no-unused-vars
  540:13  error  'beforeFailure' is assigned a value but never used           @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/metrics/metrics-cache.integration.test.ts
   55:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  135:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/monitoring/monitoring-alerting.integration.test.ts
    5:10  error  'IAlertRule' is defined but never used                          @typescript-eslint/no-unused-vars
    5:22  error  'IAlert' is defined but never used                              @typescript-eslint/no-unused-vars
    6:10  error  'NotificationChannel' is defined but never used                 @typescript-eslint/no-unused-vars
   13:7   error  'performanceMonitorService' is assigned a value but never used  @typescript-eslint/no-unused-vars
   14:7   error  'eventEmitter' is assigned a value but never used               @typescript-eslint/no-unused-vars
  131:13  error  'createAlertSpy' is assigned a value but never used             @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/monitoring/monitoring-auth.integration.test.ts
    8:10  error  'Model' is defined but never used                            @typescript-eslint/no-unused-vars
   10:17  error  A `require()` style import is forbidden                      @typescript-eslint/no-require-imports
   16:3   error  'waitForCondition' is defined but never used                 @typescript-eslint/no-unused-vars
   17:3   error  'waitForArrayLength' is defined but never used               @typescript-eslint/no-unused-vars
   18:3   error  'waitForHttpRequest' is defined but never used               @typescript-eslint/no-unused-vars
   20:3   error  'retry' is defined but never used                            @typescript-eslint/no-unused-vars
   21:3   error  'TestEnvironment' is defined but never used                  @typescript-eslint/no-unused-vars
   25:3   error  'ResponseValidators' is defined but never used               @typescript-eslint/no-unused-vars
   28:3   error  'validateDatabaseMetricsResponse' is defined but never used  @typescript-eslint/no-unused-vars
   29:3   error  'validateRedisMetricsResponse' is defined but never used     @typescript-eslint/no-unused-vars
   31:3   error  'validateHealthStatusResponse' is defined but never used     @typescript-eslint/no-unused-vars
   40:7   error  'jwtService' is assigned a value but never used              @typescript-eslint/no-unused-vars
  306:13  error  'invalidApiKey' is assigned a value but never used           @typescript-eslint/no-unused-vars
  329:13  error  'response' is assigned a value but never used                @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/monitoring/monitoring-database.integration.test.ts
  23:7  error  'performanceMonitor' is assigned a value but never used  @typescript-eslint/no-unused-vars
  27:7  error  'testApiKey' is assigned a value but never used          @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/monitoring/monitoring-performance-optimized.integration.test.ts
  24:7  error  'performanceMonitor' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/monitoring/monitoring-performance.integration.test.ts
  26:7  error  'performanceMonitor' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/monitoring/monitoring-redis.integration.test.ts
  23:7  error  'performanceMonitor' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/integration/providers/capability-registry.service.integration.test.ts
    2:10  error  'readdir' is defined but never used                            @typescript-eslint/no-unused-vars
    2:19  error  'stat' is defined but never used                               @typescript-eslint/no-unused-vars
    2:32  error  'writeFile' is defined but never used                          @typescript-eslint/no-unused-vars
   11:7   error  'loggerSpy' is assigned a value but never used                 @typescript-eslint/no-unused-vars
   32:9   error  'createMockCapabilityFile' is assigned a value but never used  @typescript-eslint/no-unused-vars
   59:14  error  'error' is defined but never used                              @typescript-eslint/no-unused-vars
  333:13  error  'existingDir' is assigned a value but never used               @typescript-eslint/no-unused-vars
  334:13  error  'nonExistentDir' is assigned a value but never used            @typescript-eslint/no-unused-vars
  340:13  error  'originalDirname' is assigned a value but never used           @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/security/auth/authorization.security.test.ts
  9:7  error  'app' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/security/monitoring/monitoring-security.test.ts
  9:7  error  'app' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/alert-history-service-optimization.spec.ts
  21:7  error  'cacheService' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/alert.controller.spec.ts
  407:15  error  'body' is assigned a value but never used    @typescript-eslint/no-unused-vars
  454:15  error  'result' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/alerting-service-optimization.spec.ts
  27:7  error  'notificationService' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/constants/notification.constants.spec.ts
   9:3  error  'NOTIFICATION_METRICS' is defined but never used                                                                     @typescript-eslint/no-unused-vars
  11:3  error  'NOTIFICATION_TIME_CONFIG' is defined but never used                                                                 @typescript-eslint/no-unused-vars
  12:3  error  'NOTIFICATION_ALERT_THRESHOLDS' is defined but never used                                                            @typescript-eslint/no-unused-vars
  35:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/notification-service-optimization.spec.ts
  19:3  error  'NOTIFICATION_CONFIG' is defined but never used        @typescript-eslint/no-unused-vars
  21:3  error  'NOTIFICATION_RETRY_CONFIG' is defined but never used  @typescript-eslint/no-unused-vars
  30:7  error  'webhookSender' is assigned a value but never used     @typescript-eslint/no-unused-vars
  32:7  error  'logSender' is assigned a value but never used         @typescript-eslint/no-unused-vars
  33:7  error  'dingtalkSender' is assigned a value but never used    @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/repositories/alert-rule.repository.spec.ts
  4:10  error  'Model' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/schemas/alert-rule.schema.spec.ts
  1:10  error  'SchemaFactory' is defined but never used  @typescript-eslint/no-unused-vars
  3:3   error  'AlertRule' is defined but never used      @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/schemas/notification-log.schema.spec.ts
  1:10  error  'SchemaFactory' is defined but never used    @typescript-eslint/no-unused-vars
  3:3   error  'NotificationLog' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/services/alert-history.service.spec.ts
  19:7  error  'model' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/services/alerting.service.enhanced.spec.ts
  255:13  error  'updateData' is assigned a value but never used     @typescript-eslint/no-unused-vars
  262:13  error  'metricPattern' is assigned a value but never used  @typescript-eslint/no-unused-vars
  757:13  error  'expiredKeys' is assigned a value but never used    @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/services/alerting.service.spec.ts
  30:7  error  'alertRuleModel' is assigned a value but never used  @typescript-eslint/no-unused-vars
  31:7  error  'eventEmitter' is assigned a value but never used    @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/services/notification-senders/slack.sender.spec.ts
  3:10  error  'BadRequestException' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/services/notification.service.comprehensive.spec.ts
  2:10  error  'EventEmitter2' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/services/notification.service.spec.ts
  22:7  error  'eventEmitter' is assigned a value but never used  @typescript-eslint/no-unused-vars
  27:7  error  'logSender' is assigned a value but never used     @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/alert/services/rule-engine.service.comprehensive.spec.ts
  467:13  error  'ruleId' is assigned a value but never used        @typescript-eslint/no-unused-vars
  487:13  error  'result' is assigned a value but never used        @typescript-eslint/no-unused-vars
  494:13  error  'ruleId' is assigned a value but never used        @typescript-eslint/no-unused-vars
  495:13  error  'alertHistory' is assigned a value but never used  @typescript-eslint/no-unused-vars
  659:13  error  'metrics' is assigned a value but never used       @typescript-eslint/no-unused-vars
  746:13  error  'templateRule' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/apikey.strategy.spec.ts
  8:10  error  'Request' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/auth-service-optimization.spec.ts
  25:7  error  'apiKeyService' is assigned a value but never used              @typescript-eslint/no-unused-vars
  26:7  error  'performanceMonitorService' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/auth.controller.spec.ts
   7:10  error  'ValidationPipe' is defined but never used  @typescript-eslint/no-unused-vars
  19:10  error  'User' is defined but never used            @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/auth.service.spec.ts
  10:10  error  'User' is defined but never used                                @typescript-eslint/no-unused-vars
  11:10  error  'ApiKey' is defined but never used                              @typescript-eslint/no-unused-vars
  26:7   error  'performanceMonitorService' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/constants/apikey.constants.enhanced.spec.ts
  336:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  343:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  350:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  357:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/decorators/auth.decorator.spec.ts
  11:10  error  'RolesGuard' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/dto/apikey.dto.spec.ts
  1:20  error  'ValidationError' is defined but never used  @typescript-eslint/no-unused-vars
  2:24  error  'Transform' is defined but never used        @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/dto/auth.dto.spec.ts
  1:20  error  'ValidationError' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/guards/rate-limit.guard.spec.ts
   19:3   error  'ApiKey' is defined but never used              @typescript-eslint/no-unused-vars
  253:16  error  'error' is defined but never used               @typescript-eslint/no-unused-vars
  339:16  error  'error' is defined but never used               @typescript-eslint/no-unused-vars
  387:16  error  'error' is defined but never used               @typescript-eslint/no-unused-vars
  437:16  error  'error' is defined but never used               @typescript-eslint/no-unused-vars
  515:13  error  'testGuard' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/guards/unified-permissions.guard.spec.ts
   8:3   error  'PermissionCheckResult' is defined but never used  @typescript-eslint/no-unused-vars
  71:33  error  'targets' is defined but never used                @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/jwt.strategy.spec.ts
  13:3   error  'JwtPayload' is defined but never used            @typescript-eslint/no-unused-vars
  65:13  error  'newStrategy' is assigned a value but never used  @typescript-eslint/no-unused-vars
  78:13  error  'newStrategy' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/permission-service-optimization.spec.ts
   15:3   error  'PERMISSION_DETAIL_TEMPLATES' is defined but never used  @typescript-eslint/no-unused-vars
   16:3   error  'PERMISSION_UTILS' is defined but never used             @typescript-eslint/no-unused-vars
  163:16  error  'error' is defined but never used                        @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/rate-limit-service-optimization.spec.ts
  4:3  error  'InternalServerErrorException' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/rate-limit.service.spec.ts
   14:3   error  'ApiKeyDocument' is defined but never used        @typescript-eslint/no-unused-vars
   19:7   error  'apiKeyModel' is assigned a value but never used  @typescript-eslint/no-unused-vars
  134:13  error  'parseWindow' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/repositories/apikey.repository.spec.ts
   8:10  error  'Model' is defined but never used                        @typescript-eslint/no-unused-vars
  13:3   error  'ApiKeyDocument' is defined but never used               @typescript-eslint/no-unused-vars
  38:9   error  'mockInactiveApiKey' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/repositories/user.repository.spec.ts
   8:10  error  'Model' is defined but never used         @typescript-eslint/no-unused-vars
  13:3   error  'UserDocument' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/auth/subjects/api-key.subject.spec.ts
  354:15  error  'rateLimit' is assigned a value but never used   @typescript-eslint/no-unused-vars
  375:15  error  'usageCount' is assigned a value but never used  @typescript-eslint/no-unused-vars
  384:15  error  'lastUsedAt' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/cache/cache.service.comprehensive.spec.ts
  184:3   error  'ServiceUnavailableException' is defined but never used  @typescript-eslint/no-unused-vars
  195:3   error  'CACHE_KEYS' is defined but never used                   @typescript-eslint/no-unused-vars
  333:18  error  A `require()` style import is forbidden                  @typescript-eslint/no-require-imports
  374:13  error  'deserializeSpy' is assigned a value but never used      @typescript-eslint/no-unused-vars
  417:13  error  'releaseLockSpy' is assigned a value but never used      @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/cache/cache.service.error-handling.spec.ts
   5:8  error  'Redis' is defined but never used                  @typescript-eslint/no-unused-vars
  81:7  error  'serializeSpy' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/cache/cache.service.spec.ts
    3:24  error  'RedisModule' is defined but never used  @typescript-eslint/no-unused-vars
  116:20  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

/home/runner/work/stock-api/stock-api/test/jest/unit/common/config/logger.config.spec.ts
   4:3  error  'TestableLogger' is defined but never used                                                                           @typescript-eslint/no-unused-vars
  29:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/cache.constants.spec.ts
  2:3  error  'CACHE_ERROR_MESSAGES' is defined but never used    @typescript-eslint/no-unused-vars
  3:3  error  'CACHE_WARNING_MESSAGES' is defined but never used  @typescript-eslint/no-unused-vars
  4:3  error  'CACHE_SUCCESS_MESSAGES' is defined but never used  @typescript-eslint/no-unused-vars
  7:3  error  'CACHE_OPERATIONS' is defined but never used        @typescript-eslint/no-unused-vars
  8:3  error  'CACHE_METRICS' is defined but never used           @typescript-eslint/no-unused-vars
  9:3  error  'CACHE_STATUS' is defined but never used            @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/data-mapper.constants.spec.ts
  14:3  error  'DATA_MAPPER_FIELD_VALIDATION_RULES' is defined but never used  @typescript-eslint/no-unused-vars
  15:3  error  'DATA_MAPPER_CACHE_CONFIG' is defined but never used            @typescript-eslint/no-unused-vars
  16:3  error  'PATH_RESOLUTION_CONFIG' is defined but never used              @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/error-messages.constants.spec.ts
   24:9   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
   39:9   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
   56:9   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
   74:9   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
   97:9   error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  320:11  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/receiver.constants.spec.ts
  12:3  error  'RECEIVER_DEFAULTS' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/storage.constants.spec.ts
  12:3  error  'STORAGE_COMPRESSION' is defined but never used     @typescript-eslint/no-unused-vars
  13:3  error  'STORAGE_BATCH_CONFIG' is defined but never used    @typescript-eslint/no-unused-vars
  14:3  error  'STORAGE_HEALTH_CONFIG' is defined but never used   @typescript-eslint/no-unused-vars
  15:3  error  'STORAGE_CLEANUP_CONFIG' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/transformer.constants.spec.ts
  11:3  error  'DATA_TYPE_CONVERSIONS' is defined but never used      @typescript-eslint/no-unused-vars
  12:3  error  'TRANSFORM_PRIORITIES' is defined but never used       @typescript-eslint/no-unused-vars
  13:3  error  'BATCH_TRANSFORM_OPTIONS' is defined but never used    @typescript-eslint/no-unused-vars
  14:3  error  'TRANSFORM_CACHE_CONFIG' is defined but never used     @typescript-eslint/no-unused-vars
  15:3  error  'TRANSFORM_LOG_LEVELS' is defined but never used       @typescript-eslint/no-unused-vars
  16:3  error  'TRANSFORM_RULE_TYPES' is defined but never used       @typescript-eslint/no-unused-vars
  17:3  error  'TRANSFORM_RESULT_FORMATS' is defined but never used   @typescript-eslint/no-unused-vars
  18:3  error  'TRANSFORM_QUALITY_METRICS' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/unified/http.constants.spec.ts
   39:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  102:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  126:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/unified/index.functions.spec.ts
  367:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  409:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  447:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/unified/operations.constants.spec.ts
   51:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  158:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  189:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  211:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/unified/performance.constants.spec.ts
  47:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  73:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/common/constants/unified/unified-cache-config.constants.spec.ts
   21:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
   36:9  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
  203:5  error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment

/home/runner/work/stock-api/stock-api/test/jest/unit/common/filters/global-exception.filter.spec.ts
  1:10  error  'Test' is defined but never used           @typescript-eslint/no-unused-vars
  1:16  error  'TestingModule' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/common/interceptors/response.interceptor.spec.ts
  3:10  error  'Observable' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/query.controller.spec.ts
  2:10  error  'Logger' is defined but never used          @typescript-eslint/no-unused-vars
  2:18  error  'ValidationPipe' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/query.service.spec.ts
   2:31  error  'NotFoundException' is defined but never used  @typescript-eslint/no-unused-vars
  15:3   error  'SortDirection' is defined but never used      @typescript-eslint/no-unused-vars
  27:10  error  'DataResponseDto' is defined but never used    @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/query/dto/query-request.dto.spec.ts
  1:20  error  'ValidationError' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/query/enums/index.enum.functions.spec.ts
  222:16  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/query/services/query-result-processor.service.spec.ts
  17:10  error  'createLogger' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/query/services/query-statistics.service.spec.ts
  3:10  error  'QueryType' is defined but never used      @typescript-eslint/no-unused-vars
  5:10  error  'QueryStatsDto' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/query/utils/query.util.spec.ts
  62:11  error  'originalDateNow' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/receiver.controller.spec.ts
  2:10  error  'Logger' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/receiver.service.spec.ts
   12:10  error  'BadRequestException' is defined but never used  @typescript-eslint/no-unused-vars
   12:31  error  'NotFoundException' is defined but never used    @typescript-eslint/no-unused-vars
  329:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  362:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  394:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  429:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  751:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  783:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  812:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  914:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars
  955:13  error  'result' is assigned a value but never used      @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/receiver/receiver.controller.spec.ts
  29:7  error  'receiverService' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/shared/services/data-change-detector.service.spec.ts
    4:3   error  'ChangeDetectionResult' is defined but never used  @typescript-eslint/no-unused-vars
    8:10  error  'createLogger' is defined but never used           @typescript-eslint/no-unused-vars
  847:32  error  'index' is defined but never used                  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/shared/services/data-fetching.service.spec.ts
   6:3  error  'DataFetchResponse' is defined but never used       @typescript-eslint/no-unused-vars
  31:7  error  'mockDataChangeDetector' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/shared/services/market-status.service.spec.ts
  8:10  error  'createLogger' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/storage.service.spec.ts
   2:10  error  'Logger' is defined but never used                    @typescript-eslint/no-unused-vars
  56:7   error  'mockRedis' is assigned a value but never used        @typescript-eslint/no-unused-vars
  81:7   error  'storedDataModel' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/storage/repositories/storage.repository.spec.ts
  485:15  error  'mockKeys' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/storage/schemas/storage.schema.spec.ts
  294:11  error  'expiresAtIndex' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/storage/storage.service.spec.ts
  9:10  error  'ServiceUnavailableException' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/symbol-mapper/schemas/symbol-mapping-rule.schema.spec.ts
  449:64  error  'index' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/symbol-mapper/symbol-mapper.service.spec.ts
  7:3  error  'SymbolMappingRule' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/core/transformer.service.spec.ts
  12:10  error  'TransformPreviewDto' is defined but never used  @typescript-eslint/no-unused-vars
  13:10  error  'createLogger' is defined but never used         @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/metrics/decorators/database-performance.decorator.spec.ts
    6:10  error  'PerformanceMonitorService' is defined but never used  @typescript-eslint/no-unused-vars
   59:19  error  'filter' is defined but never used                     @typescript-eslint/no-unused-vars
  161:32  error  'token' is defined but never used                      @typescript-eslint/no-unused-vars
  275:28  error  'key' is defined but never used                        @typescript-eslint/no-unused-vars
  295:28  error  'key' is defined but never used                        @typescript-eslint/no-unused-vars
  314:20  error  'key' is defined but never used                        @typescript-eslint/no-unused-vars
  314:33  error  'value' is defined but never used                      @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/metrics/interceptors/performance.interceptor.spec.ts
  8:10  error  'Observable' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/metrics/performance-metrics.repository.comprehensive.spec.ts
  8:3  error  'PERFORMANCE_INTERVALS' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/metrics/performance-monitor.service.comprehensive.spec.ts
   7:3  error  'PERFORMANCE_INTERVALS' is defined but never used  @typescript-eslint/no-unused-vars
  12:3  error  'HEALTH_SCORE_CONFIG' is defined but never used    @typescript-eslint/no-unused-vars
  16:3  error  'REDIS_INFO' is defined but never used             @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/metrics/repositories/performance-metrics.repository.spec.ts
   9:3   error  'PERFORMANCE_INTERVALS' is defined but never used  @typescript-eslint/no-unused-vars
  11:10  error  'createLogger' is defined but never used           @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/metrics/services/performance-monitor.service.spec.ts
   9:3  error  'AuthStatus' is defined but never used       @typescript-eslint/no-unused-vars
  10:3  error  'OperationStatus' is defined but never used  @typescript-eslint/no-unused-vars
  14:3  error  'METRIC_UNITS' is defined but never used     @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/monitoring/monitoring.controller.spec.ts
  12:3  error  'Logger' is defined but never used               @typescript-eslint/no-unused-vars
  40:7  error  'mockLogger' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/providers/capability-registry.service.spec.ts
    9:13  error  'path' is defined but never used            @typescript-eslint/no-unused-vars
  386:18  error  A `require()` style import is forbidden     @typescript-eslint/no-require-imports
  399:18  error  A `require()` style import is forbidden     @typescript-eslint/no-require-imports
  413:18  error  A `require()` style import is forbidden     @typescript-eslint/no-require-imports
  996:38  error  'capabilityName' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/security/jwt-validation.spec.ts
  11:7  error  'mockConfigService' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/security/repositories/security-scan-result.repository.spec.ts
   3:10  error  'Model' is defined but never used                       @typescript-eslint/no-unused-vars
   7:3   error  'SecurityScanResultDocument' is defined but never used  @typescript-eslint/no-unused-vars
  29:7   error  'model' is assigned a value but never used              @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/security/security-audit-optimization.spec.ts
  18:7  error  'eventEmitter' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/security/security-scanner-optimization.spec.ts
  19:7  error  'scanResultRepository' is assigned a value but never used  @typescript-eslint/no-unused-vars
  20:7  error  'configService' is assigned a value but never used         @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/security/security-scanner.service.spec.ts
  17:3  error  'SECURITY_SCANNER_OPERATIONS' is defined but never used  @typescript-eslint/no-unused-vars
  18:3  error  'SECURITY_SCANNER_MESSAGES' is defined but never used    @typescript-eslint/no-unused-vars
  27:7  error  'mockLogger' is assigned a value but never used          @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/jest/unit/security/utils/vulnerability-template.util.spec.ts
  8:10  error  'SecurityVulnerability' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/scripts/generate-unified-report.ts
  114:11  error  'totalSkipped' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/scripts/validate-test-config.ts
   10:10  error  'execSync' is defined but never used                @typescript-eslint/no-unused-vars
  107:13  error  'configContent' is assigned a value but never used  @typescript-eslint/no-unused-vars
  985:12  error  A `require()` style import is forbidden             @typescript-eslint/no-require-imports

/home/runner/work/stock-api/stock-api/test/utils/batch-request-helper.ts
  40:7  error  'maxConcurrency' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/utils/coverage-analyzer.ts
  524:27  error  '_report' is defined but never used   @typescript-eslint/no-unused-vars
  528:5   error  '_quality' is defined but never used  @typescript-eslint/no-unused-vars
  529:5   error  '_gaps' is defined but never used     @typescript-eslint/no-unused-vars
  533:22  error  '_report' is defined but never used   @typescript-eslint/no-unused-vars
  536:25  error  '_report' is defined but never used   @typescript-eslint/no-unused-vars
  545:35  error  '_files' is defined but never used    @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/utils/coverage-gate-checker.ts
    2:13  error  'path' is defined but never used   @typescript-eslint/no-unused-vars
   79:18  error  'error' is defined but never used  @typescript-eslint/no-unused-vars
  492:14  error  'error' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/utils/coverage-merger.ts
  302:13  error  'nycInstance' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/utils/coverage-trend-checker.ts
   77:14  error  'error' is defined but never used        @typescript-eslint/no-unused-vars
  101:18  error  'error' is defined but never used        @typescript-eslint/no-unused-vars
  461:28  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports

/home/runner/work/stock-api/stock-api/test/utils/monitoring-test-helpers.ts
  95:57  error  'retries' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/utils/naming-validator.ts
  1:13  error  'fs' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/utils/test-data-manager.ts
  6:10  error  'Model' is defined but never used  @typescript-eslint/no-unused-vars

/home/runner/work/stock-api/stock-api/test/utils/test-structure-validator.ts
  209:11  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
  231:14  error  'error' is defined but never used        @typescript-eslint/no-unused-vars

✖ 376 problems (376 errors, 0 warnings)

error: "eslint" exited with code 1
error: script "lint" exited with code 1
Error: Process completed with exit code 1.


====================================================================================

Annotations
Notify Results
Notify failure

Run echo "❌ 测试失败，请检查日志"
❌ 测试失败，请检查日志
Error: Process completed with exit code 1.