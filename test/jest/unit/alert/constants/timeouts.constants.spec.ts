import { 
  ALERT_TIMEOUTS, 
  OPERATION_TIMEOUTS, 
  DATA_RETENTION 
} from "../../../../../src/alert/constants/timeouts.constants";

describe("AlertTimeouts", () => {
  describe("ALERT_TIMEOUTS", () => {
    it("should have correct timeout values", () => {
      expect(ALERT_TIMEOUTS.CRITICAL_RESPONSE).toBe(5);
      expect(ALERT_TIMEOUTS.NORMAL_RESPONSE).toBe(30);
      expect(ALERT_TIMEOUTS.EVALUATION_CYCLE).toBe(60);
    });

    it("should have positive timeout values", () => {
      Object.values(ALERT_TIMEOUTS).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it("should maintain logical timeout order", () => {
      expect(ALERT_TIMEOUTS.CRITICAL_RESPONSE).toBeLessThan(ALERT_TIMEOUTS.NORMAL_RESPONSE);
      expect(ALERT_TIMEOUTS.NORMAL_RESPONSE).toBeLessThan(ALERT_TIMEOUTS.EVALUATION_CYCLE);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_TIMEOUTS.CRITICAL_RESPONSE = 10;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_TIMEOUTS.NORMAL_RESPONSE = 60;
      }).toThrow();
    });

    it("should have the correct types", () => {
      Object.values(ALERT_TIMEOUTS).forEach(value => {
        expect(typeof value).toBe("number");
      });
    });
  });

  describe("OPERATION_TIMEOUTS", () => {
    it("should have correct operation timeout values", () => {
      expect(OPERATION_TIMEOUTS.VALIDATION_TIMEOUT).toBe(1000);
      expect(OPERATION_TIMEOUTS.CACHE_OPERATION).toBe(5000);
      expect(OPERATION_TIMEOUTS.DATABASE_QUERY).toBe(5000);
      expect(OPERATION_TIMEOUTS.DATABASE_WRITE).toBe(10000);
      expect(OPERATION_TIMEOUTS.API_REQUEST).toBe(30000);
      expect(OPERATION_TIMEOUTS.EMAIL_SEND).toBe(30000);
      expect(OPERATION_TIMEOUTS.SMS_SEND).toBe(5000);
      expect(OPERATION_TIMEOUTS.WEBHOOK_CALL).toBe(5000);
      expect(OPERATION_TIMEOUTS.BATCH_OPERATION).toBe(60000);
      expect(OPERATION_TIMEOUTS.REPORT_GENERATION).toBe(300000);
      expect(OPERATION_TIMEOUTS.DATA_EXPORT).toBe(600000);
    });

    it("should have positive timeout values", () => {
      Object.values(OPERATION_TIMEOUTS).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it("should maintain logical timeout order for related operations", () => {
      expect(OPERATION_TIMEOUTS.VALIDATION_TIMEOUT).toBeLessThan(OPERATION_TIMEOUTS.CACHE_OPERATION);
      expect(OPERATION_TIMEOUTS.DATABASE_QUERY).toBeLessThan(OPERATION_TIMEOUTS.DATABASE_WRITE);
      expect(OPERATION_TIMEOUTS.SMS_SEND).toBeLessThan(OPERATION_TIMEOUTS.EMAIL_SEND);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        OPERATION_TIMEOUTS.VALIDATION_TIMEOUT = 2000;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        OPERATION_TIMEOUTS.API_REQUEST = 60000;
      }).toThrow();
    });

    it("should have the correct types", () => {
      Object.values(OPERATION_TIMEOUTS).forEach(value => {
        expect(typeof value).toBe("number");
      });
    });
  });

  describe("DATA_RETENTION", () => {
    it("should have correct data retention values", () => {
      expect(DATA_RETENTION.ALERT_HISTORY).toBe(90);
      expect(DATA_RETENTION.ALERT_METRICS).toBe(30);
      expect(DATA_RETENTION.SYSTEM_LOGS).toBe(30);
      expect(DATA_RETENTION.ERROR_LOGS).toBe(90);
      expect(DATA_RETENTION.AUDIT_LOGS).toBe(365);
      expect(DATA_RETENTION.USER_ACTIVITY).toBe(90);
      expect(DATA_RETENTION.SESSION_LOGS).toBe(30);
      expect(DATA_RETENTION.NOTIFICATION_LOGS).toBe(30);
      expect(DATA_RETENTION.DELIVERY_STATUS).toBe(30);
      expect(DATA_RETENTION.ARCHIVED_DATA).toBe(365);
      expect(DATA_RETENTION.BACKUP_DATA).toBe(365);
    });

    it("should have positive retention values", () => {
      Object.values(DATA_RETENTION).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it("should maintain logical retention order for related data", () => {
      expect(DATA_RETENTION.ALERT_METRICS).toBeLessThan(DATA_RETENTION.ALERT_HISTORY);
      expect(DATA_RETENTION.SYSTEM_LOGS).toBeLessThan(DATA_RETENTION.ERROR_LOGS);
      expect(DATA_RETENTION.NOTIFICATION_LOGS).toBeLessThan(DATA_RETENTION.AUDIT_LOGS);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        DATA_RETENTION.ALERT_HISTORY = 180;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        DATA_RETENTION.SYSTEM_LOGS = 60;
      }).toThrow();
    });

    it("should have the correct types", () => {
      Object.values(DATA_RETENTION).forEach(value => {
        expect(typeof value).toBe("number");
      });
    });
  });
});