import { AlertToNotificationAdapter } from '@notification/adapters/alert-to-notification.adapter';

describe('Notification Adapters Index', () => {
  describe('AlertToNotificationAdapter', () => {
    it('should export AlertToNotificationAdapter', () => {
      expect(AlertToNotificationAdapter).toBeDefined();
      expect(typeof AlertToNotificationAdapter).toBe('function');
    });

    it('should be instantiable', () => {
      const adapter = new AlertToNotificationAdapter();
      expect(adapter).toBeInstanceOf(AlertToNotificationAdapter);
    });

    it('should have required methods', () => {
      const adapter = new AlertToNotificationAdapter();
      
      // Check that all public methods exist
      expect(typeof adapter.adapt).toBe('function');
      expect(typeof adapter.adaptMany).toBe('function');
      expect(typeof adapter.validateAlertEvent).toBe('function');
    });
  });

  // Test that the index file properly exports all adapters
  describe('Module Exports', () => {
    it('should re-export all adapters from individual files', () => {
      // Import the index file
      const indexExports = require('@notification/adapters/index');
      
      // Should export AlertToNotificationAdapter
      expect(indexExports.AlertToNotificationAdapter).toBeDefined();
      
      // Should also be available as a direct import
      expect(typeof indexExports.AlertToNotificationAdapter).toBe('function');
    });
  });
});