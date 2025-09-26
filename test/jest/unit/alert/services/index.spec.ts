import {
  AlertOrchestratorService,
  AlertRuleService,
  AlertEvaluationService,
  AlertLifecycleService,
  AlertQueryService,
  AlertCacheService,
  AlertEventPublisher
} from '@alert/services';

describe('Alert Services Index', () => {
  describe('Service Exports', () => {
    it('should export AlertOrchestratorService', () => {
      expect(AlertOrchestratorService).toBeDefined();
    });

    it('should export AlertRuleService', () => {
      expect(AlertRuleService).toBeDefined();
    });

    it('should export AlertEvaluationService', () => {
      expect(AlertEvaluationService).toBeDefined();
    });

    it('should export AlertLifecycleService', () => {
      expect(AlertLifecycleService).toBeDefined();
    });

    it('should export AlertQueryService', () => {
      expect(AlertQueryService).toBeDefined();
    });

    it('should export AlertCacheService', () => {
      expect(AlertCacheService).toBeDefined();
    });

    it('should export AlertEventPublisher', () => {
      expect(AlertEventPublisher).toBeDefined();
    });
  });

  describe('Service Compatibility', () => {
    it('should allow importing all services together', () => {
      // This test just verifies that all services can be imported without conflicts
      const services = {
        AlertOrchestratorService,
        AlertRuleService,
        AlertEvaluationService,
        AlertLifecycleService,
        AlertQueryService,
        AlertCacheService,
        AlertEventPublisher
      };

      expect(Object.keys(services)).toHaveLength(7);
      expect(services.AlertOrchestratorService).toBeDefined();
      expect(services.AlertRuleService).toBeDefined();
      expect(services.AlertEvaluationService).toBeDefined();
      expect(services.AlertLifecycleService).toBeDefined();
      expect(services.AlertQueryService).toBeDefined();
      expect(services.AlertCacheService).toBeDefined();
      expect(services.AlertEventPublisher).toBeDefined();
    });
  });
});