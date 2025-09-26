import { AlertType, NotificationChannel } from '@alert/constants/enums';

describe('Alert Enums', () => {
  describe('AlertType Enum', () => {
    it('should have correct alert type values', () => {
      expect(AlertType.PRICE_ALERT).toBe('price_alert');
      expect(AlertType.VOLUME_ALERT).toBe('volume_alert');
      expect(AlertType.TECHNICAL_ALERT).toBe('technical_alert');
      expect(AlertType.NEWS_ALERT).toBe('news_alert');
      expect(AlertType.SYSTEM_ALERT).toBe('system_alert');
      expect(AlertType.CUSTOM_ALERT).toBe('custom_alert');
    });

    it('should have unique values', () => {
      const values = Object.values(AlertType);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });

    it('should be exhaustive', () => {
      // Verify all expected alert types are present
      expect(Object.keys(AlertType)).toHaveLength(6);
      expect(Object.keys(AlertType)).toContain('PRICE_ALERT');
      expect(Object.keys(AlertType)).toContain('VOLUME_ALERT');
      expect(Object.keys(AlertType)).toContain('TECHNICAL_ALERT');
      expect(Object.keys(AlertType)).toContain('NEWS_ALERT');
      expect(Object.keys(AlertType)).toContain('SYSTEM_ALERT');
      expect(Object.keys(AlertType)).toContain('CUSTOM_ALERT');
    });

    it('should have descriptive values', () => {
      // Verify that values are descriptive and follow naming convention
      Object.values(AlertType).forEach(value => {
        expect(value).toMatch(/^[a-z_]+$/);
        expect(value.includes('_alert')).toBe(true);
      });
    });
  });

  describe('NotificationChannel Enum', () => {
    it('should have correct notification channel values', () => {
      expect(NotificationChannel.EMAIL).toBe('email');
      expect(NotificationChannel.SMS).toBe('sms');
      expect(NotificationChannel.WEBHOOK).toBe('webhook');
      expect(NotificationChannel.PUSH).toBe('push');
      expect(NotificationChannel.IN_APP).toBe('in_app');
    });

    it('should have unique values', () => {
      const values = Object.values(NotificationChannel);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });

    it('should be exhaustive', () => {
      // Verify all expected notification channels are present
      expect(Object.keys(NotificationChannel)).toHaveLength(5);
      expect(Object.keys(NotificationChannel)).toContain('EMAIL');
      expect(Object.keys(NotificationChannel)).toContain('SMS');
      expect(Object.keys(NotificationChannel)).toContain('WEBHOOK');
      expect(Object.keys(NotificationChannel)).toContain('PUSH');
      expect(Object.keys(NotificationChannel)).toContain('IN_APP');
    });

    it('should have descriptive values', () => {
      // Verify that values are descriptive and follow naming convention
      Object.values(NotificationChannel).forEach(value => {
        expect(value).toMatch(/^[a-z_]+$/);
      });
    });
  });

  describe('Enum Integration', () => {
    it('should be usable in business logic', () => {
      // Test that enums can be used in conditional logic
      const alertType = AlertType.PRICE_ALERT;
      const channel = NotificationChannel.EMAIL;

      expect(alertType).toBe('price_alert');
      expect(channel).toBe('email');

      // Test enum comparison
      expect(alertType === AlertType.PRICE_ALERT).toBe(true);
      expect(channel === NotificationChannel.EMAIL).toBe(true);
    });

    it('should be compatible with type checking', () => {
      // Test that enums work with type checking
      const isPriceAlert = (type: AlertType): boolean => {
        return type === AlertType.PRICE_ALERT;
      };

      const isEmailChannel = (channel: NotificationChannel): boolean => {
        return channel === NotificationChannel.EMAIL;
      };

      expect(isPriceAlert(AlertType.PRICE_ALERT)).toBe(true);
      expect(isEmailChannel(NotificationChannel.EMAIL)).toBe(true);
      expect(isPriceAlert(AlertType.VOLUME_ALERT)).toBe(false);
      expect(isEmailChannel(NotificationChannel.SMS)).toBe(false);
    });

    it('should support iteration', () => {
      // Test that enums can be iterated over
      const alertTypes = Object.values(AlertType);
      const notificationChannels = Object.values(NotificationChannel);

      expect(alertTypes).toContain('price_alert');
      expect(alertTypes).toContain('volume_alert');
      expect(notificationChannels).toContain('email');
      expect(notificationChannels).toContain('sms');
    });
  });
});