import {
  NotificationLogSchema,
} from "../../../../../src/alert/schemas/notification-log.schema";

describe("NotificationLogSchema", () => {
  it("should create a valid NotificationLog model", () => {
    const schemaDefinition = NotificationLogSchema.obj;

    expect(schemaDefinition).toHaveProperty("id");
    expect(schemaDefinition).toHaveProperty("alertId");
    expect(schemaDefinition).toHaveProperty("channelId");
    expect(schemaDefinition).toHaveProperty("channelType");
    expect(schemaDefinition).toHaveProperty("success");
    expect(schemaDefinition).toHaveProperty("sentAt");
    expect(schemaDefinition).toHaveProperty("duration");
    expect(schemaDefinition).toHaveProperty("retryCount");

    expect((schemaDefinition.id as any).unique).toBe(true);
    expect((schemaDefinition.retryCount as any).default).toBe(0);
  });

  it("should have correct indexes", () => {
    const indexes = NotificationLogSchema.indexes();
    const expectedIndexes = [
      [{ id: 1 }, { unique: true, background: true }],
      [{ alertId: 1, sentAt: -1 }, { background: true }],
      [{ channelType: 1, success: 1 }, { background: true }],
      [{ sentAt: -1 }, { background: true }],
      [{ success: 1, sentAt: -1 }, { background: true }],
      [{ channelId: 1, sentAt: -1 }, { background: true }],
      [{ sentAt: 1 }, { expireAfterSeconds: 2592000, background: true }],
    ];

    // Sort both arrays to ensure order doesn't affect the test
    const sortFn = (a, b) =>
      JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]));

    expect(indexes.sort(sortFn)).toEqual(expectedIndexes.sort(sortFn));
  });
});
