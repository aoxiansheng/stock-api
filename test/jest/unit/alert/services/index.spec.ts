import * as AlertServicesIndex from '../../../../../src/alert/services/index';
import { AlertingService } from '../../../../../src/alert/services/alerting.service';
import { AlertHistoryService } from '../../../../../src/alert/services/alert-history.service';
import { NotificationService } from '../../../../../src/alert/services/notification.service';
import { RuleEngineService } from '../../../../../src/alert/services/rule-engine.service';

describe('Alert Services Index', () => {
  it('should export AlertingService', () => {
    expect(AlertServicesIndex.AlertingService).toBeDefined();
    expect(AlertServicesIndex.AlertingService).toBe(AlertingService);
  });

  it('should export AlertHistoryService', () => {
    expect(AlertServicesIndex.AlertHistoryService).toBeDefined();
    expect(AlertServicesIndex.AlertHistoryService).toBe(AlertHistoryService);
  });

  it('should export NotificationService', () => {
    expect(AlertServicesIndex.NotificationService).toBeDefined();
    expect(AlertServicesIndex.NotificationService).toBe(NotificationService);
  });

  it('should export RuleEngineService', () => {
    expect(AlertServicesIndex.RuleEngineService).toBeDefined();
    expect(AlertServicesIndex.RuleEngineService).toBe(RuleEngineService);
  });

  it('should export all expected services', () => {
    const expectedExports = [
      'AlertingService', 
      'AlertHistoryService', 
      'NotificationService', 
      'RuleEngineService'
    ];
    
    expectedExports.forEach(exportName => {
      expect(AlertServicesIndex[exportName]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.values(AlertServicesIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });

  it('should have all exports as constructors', () => {
    Object.values(AlertServicesIndex).forEach(exportedValue => {
      expect(typeof exportedValue).toBe('function');
    });
  });

  it('should support service class references', () => {
    expect(AlertServicesIndex.AlertingService).toBeInstanceOf(Function);
    expect(AlertServicesIndex.AlertHistoryService).toBeInstanceOf(Function);
    expect(AlertServicesIndex.NotificationService).toBeInstanceOf(Function);
    expect(AlertServicesIndex.RuleEngineService).toBeInstanceOf(Function);
  });

  it('should maintain service consistency', () => {
    // All alert services should be exported consistently
    const serviceNames = Object.keys(AlertServicesIndex);
    serviceNames.forEach(name => {
      expect(name.endsWith('Service')).toBe(true);
    });
  });
});
