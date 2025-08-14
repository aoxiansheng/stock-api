import * as AlertDtoIndex from '../../../../../src/alert/dto/index';
import { AlertDto } from '../../../../../src/alert/dto/alert.dto';
import { AlertRuleDto } from '../../../../../src/alert/dto/alert-rule.dto';
import { NotificationChannelDto } from '../../../../../src/alert/dto/notification-channel.dto';

describe('Alert DTO Index', () => {
  it('should export AlertDto', () => {
    expect(AlertDtoIndex.AlertDto).toBeDefined();
    expect(AlertDtoIndex.AlertDto).toBe(AlertDto);
  });

  it('should export AlertRuleDto', () => {
    expect(AlertDtoIndex.AlertRuleDto).toBeDefined();
    expect(AlertDtoIndex.AlertRuleDto).toBe(AlertRuleDto);
  });

  it('should export NotificationChannelDto', () => {
    expect(AlertDtoIndex.NotificationChannelDto).toBeDefined();
    expect(AlertDtoIndex.NotificationChannelDto).toBe(NotificationChannelDto);
  });

  it('should export all expected DTOs', () => {
    const expectedExports = ['AlertDto', 'AlertRuleDto', 'NotificationChannelDto'];
    
    expectedExports.forEach(exportName => {
      expect(AlertDtoIndex[exportName]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.values(AlertDtoIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });

  it('should have all exports as constructors', () => {
    Object.values(AlertDtoIndex).forEach(exportedValue => {
      expect(typeof exportedValue).toBe('function');
    });
  });

  it('should support DTO class references', () => {
    expect(AlertDtoIndex.AlertDto).toBeInstanceOf(Function);
    expect(AlertDtoIndex.AlertRuleDto).toBeInstanceOf(Function);
    expect(AlertDtoIndex.NotificationChannelDto).toBeInstanceOf(Function);
  });
});
