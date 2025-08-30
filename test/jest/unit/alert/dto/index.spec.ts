import  AlertDtoIndex from '../../../../../src/alert/dto/index';
import { AlertResponseDto } from '../../../../../src/alert/dto/alert.dto';
import { CreateAlertRuleDto } from '../../../../../src/alert/dto/alert-rule.dto';
import { NotificationChannelDto } from '../../../../../src/alert/dto/notification-channel.dto';

describe('Alert DTO Index', () => {
  it('should export AlertResponseDto', () => {
    expect(AlertDtoIndex.AlertResponseDto).toBeDefined();
    expect(AlertDtoIndex.AlertResponseDto).toBe(AlertResponseDto);
  });

  it('should export CreateAlertRuleDto', () => {
    expect(AlertDtoIndex.CreateAlertRuleDto).toBeDefined();
    expect(AlertDtoIndex.CreateAlertRuleDto).toBe(CreateAlertRuleDto);
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
    expect(AlertDtoIndex.AlertResponseDto).toBeInstanceOf(Function);
    expect(AlertDtoIndex.CreateAlertRuleDto).toBeInstanceOf(Function);
    expect(AlertDtoIndex.NotificationChannelDto).toBeInstanceOf(Function);
  });
});
