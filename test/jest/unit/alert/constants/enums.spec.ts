import { 
  AlertSeverity, 
  AlertStatus, 
  NotificationChannelType, 
  NotificationStatus 
} from "../../../../../src/alert/types/alert.types";

describe("AlertEnums", () => {
  describe("AlertSeverity", () => {
    it("should have correct severity values", () => {
      expect(AlertSeverity.CRITICAL).toBe("critical");
      expect(AlertSeverity.WARNING).toBe("warning");
      expect(AlertSeverity.INFO).toBe("info");
    });

    it("should have unique severity values", () => {
      const values = Object.values(AlertSeverity);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        AlertSeverity.CRITICAL = "severe";
      }).toThrow();
    });
  });

  describe("AlertStatus", () => {
    it("should have correct status values", () => {
      expect(AlertStatus.FIRING).toBe("firing");
      expect(AlertStatus.ACKNOWLEDGED).toBe("acknowledged");
      expect(AlertStatus.RESOLVED).toBe("resolved");
      expect(AlertStatus.SUPPRESSED).toBe("suppressed");
    });

    it("should have unique status values", () => {
      const values = Object.values(AlertStatus);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        AlertStatus.FIRING = "active";
      }).toThrow();
    });
  });

  describe("NotificationChannelType", () => {
    it("should have correct channel type values", () => {
      expect(NotificationChannelType.EMAIL).toBe("email");
      expect(NotificationChannelType.WEBHOOK).toBe("webhook");
      expect(NotificationChannelType.SLACK).toBe("slack");
      expect(NotificationChannelType.LOG).toBe("log");
      expect(NotificationChannelType.SMS).toBe("sms");
      expect(NotificationChannelType.DINGTALK).toBe("dingtalk");
    });

    it("should have unique channel type values", () => {
      const values = Object.values(NotificationChannelType);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        NotificationChannelType.EMAIL = "e-mail";
      }).toThrow();
    });
  });

  describe("NotificationStatus", () => {
    it("should have correct notification status values", () => {
      expect(NotificationStatus.PENDING).toBe("pending");
      expect(NotificationStatus.SENT).toBe("sent");
      expect(NotificationStatus.DELIVERED).toBe("delivered");
      expect(NotificationStatus.FAILED).toBe("failed");
      expect(NotificationStatus.RETRY).toBe("retry");
    });

    it("should have unique notification status values", () => {
      const values = Object.values(NotificationStatus);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        NotificationStatus.SENT = "delivered";
      }).toThrow();
    });
  });
});