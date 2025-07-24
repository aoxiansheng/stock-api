import {
  OPERATION_CONSTANTS,
  getSuccessMessage,
  getFailureMessage,
  isQueryOperation,
  isMutationOperation,
  isBatchOperation,
  shouldRefreshData,
  getPriorityWeight,
} from "@common/constants/unified/operations.constants";

describe("OPERATION_CONSTANTS", () => {
  describe("CRUD_MESSAGES", () => {
    it("should have all required CRUD success messages", () => {
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.CREATE_SUCCESS).toBe("创建成功");
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.UPDATE_SUCCESS).toBe("更新成功");
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.DELETE_SUCCESS).toBe("删除成功");
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_SUCCESS).toBe("查询成功");
    });

    it("should have all required CRUD failure messages", () => {
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.CREATE_FAILED).toBe("创建失败");
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.UPDATE_FAILED).toBe("更新失败");
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.DELETE_FAILED).toBe("删除失败");
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_FAILED).toBe("查询失败");
    });

    it("should have validation messages", () => {
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.VALIDATION_FAILED).toBe(
        "数据验证失败",
      );
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.VALIDATION_SUCCESS).toBe(
        "数据验证成功",
      );
    });

    it("should have resource status messages", () => {
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.RESOURCE_NOT_FOUND).toBe(
        "资源不存在",
      );
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.RESOURCE_ALREADY_EXISTS).toBe(
        "资源已存在",
      );
      expect(OPERATION_CONSTANTS.CRUD_MESSAGES.PERMISSION_DENIED).toBe(
        "权限不足",
      );
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore
        OPERATION_CONSTANTS.CRUD_MESSAGES.CREATE_SUCCESS = "修改的消息";
      }).toThrow();
    });
  });

  describe("OPERATION_TYPES", () => {
    it("should have all basic CRUD operations", () => {
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.CREATE).toBe("create");
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.READ).toBe("read");
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.UPDATE).toBe("update");
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.DELETE).toBe("delete");
    });

    it("should have extended operations", () => {
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.VALIDATE).toBe("validate");
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.PROCESS).toBe("process");
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.SYNC).toBe("sync");
    });

    it("should have batch operations", () => {
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.BATCH_CREATE).toBe(
        "batch_create",
      );
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.BATCH_UPDATE).toBe(
        "batch_update",
      );
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.BATCH_DELETE).toBe(
        "batch_delete",
      );
    });

    it("should have query operations", () => {
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.QUERY).toBe("query");
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.SEARCH).toBe("search");
      expect(OPERATION_CONSTANTS.OPERATION_TYPES.FILTER).toBe("filter");
    });
  });

  describe("DATA_STATES", () => {
    it("should have all required data states", () => {
      expect(OPERATION_CONSTANTS.DATA_STATES.FRESH).toBe("fresh");
      expect(OPERATION_CONSTANTS.DATA_STATES.STALE).toBe("stale");
      expect(OPERATION_CONSTANTS.DATA_STATES.DIRTY).toBe("dirty");
      expect(OPERATION_CONSTANTS.DATA_STATES.CACHED).toBe("cached");
      expect(OPERATION_CONSTANTS.DATA_STATES.CORRUPTED).toBe("corrupted");
    });
  });

  describe("PRIORITY_LEVELS", () => {
    it("should have all priority levels", () => {
      expect(OPERATION_CONSTANTS.PRIORITY_LEVELS.CRITICAL).toBe("critical");
      expect(OPERATION_CONSTANTS.PRIORITY_LEVELS.HIGH).toBe("high");
      expect(OPERATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM).toBe("medium");
      expect(OPERATION_CONSTANTS.PRIORITY_LEVELS.LOW).toBe("low");
      expect(OPERATION_CONSTANTS.PRIORITY_LEVELS.BACKGROUND).toBe("background");
    });
  });

  describe("QUALITY_LEVELS", () => {
    it("should have all quality levels", () => {
      expect(OPERATION_CONSTANTS.QUALITY_LEVELS.EXCELLENT).toBe("excellent");
      expect(OPERATION_CONSTANTS.QUALITY_LEVELS.GOOD).toBe("good");
      expect(OPERATION_CONSTANTS.QUALITY_LEVELS.FAIR).toBe("fair");
      expect(OPERATION_CONSTANTS.QUALITY_LEVELS.POOR).toBe("poor");
      expect(OPERATION_CONSTANTS.QUALITY_LEVELS.UNKNOWN).toBe("unknown");
    });
  });

  describe("PROCESSING_MODES", () => {
    it("should have all processing modes", () => {
      expect(OPERATION_CONSTANTS.PROCESSING_MODES.REAL_TIME).toBe("real_time");
      expect(OPERATION_CONSTANTS.PROCESSING_MODES.BATCH).toBe("batch");
      expect(OPERATION_CONSTANTS.PROCESSING_MODES.STREAMING).toBe("streaming");
      expect(OPERATION_CONSTANTS.PROCESSING_MODES.SCHEDULED).toBe("scheduled");
      expect(OPERATION_CONSTANTS.PROCESSING_MODES.ON_DEMAND).toBe("on_demand");
    });
  });

  describe("NOTIFICATION_TYPES", () => {
    it("should have all notification types", () => {
      expect(OPERATION_CONSTANTS.NOTIFICATION_TYPES.INFO).toBe("info");
      expect(OPERATION_CONSTANTS.NOTIFICATION_TYPES.SUCCESS).toBe("success");
      expect(OPERATION_CONSTANTS.NOTIFICATION_TYPES.WARNING).toBe("warning");
      expect(OPERATION_CONSTANTS.NOTIFICATION_TYPES.ERROR).toBe("error");
      expect(OPERATION_CONSTANTS.NOTIFICATION_TYPES.CRITICAL).toBe("critical");
    });
  });
});

describe("getSuccessMessage", () => {
  it("should return correct success message for basic CRUD operations", () => {
    expect(getSuccessMessage("create")).toBe("创建成功");
    expect(getSuccessMessage("update")).toBe("更新成功");
    expect(getSuccessMessage("delete")).toBe("删除成功");
    expect(getSuccessMessage("read")).toBe("查询成功");
  });

  it("should return correct success message for extended operations", () => {
    expect(getSuccessMessage("query")).toBe("查询成功");
    expect(getSuccessMessage("import")).toBe("导入成功");
    expect(getSuccessMessage("export")).toBe("导出成功");
    expect(getSuccessMessage("sync")).toBe("同步成功");
    expect(getSuccessMessage("validate")).toBe("数据验证成功");
  });

  it("should return default message for unknown operations", () => {
    // @ts-ignore - Testing runtime behavior
    expect(getSuccessMessage("unknown_operation")).toBe("处理已完成");
  });

  it("should handle all defined operation types", () => {
    const operations = Object.values(OPERATION_CONSTANTS.OPERATION_TYPES);
    operations.forEach((operation) => {
      const message = getSuccessMessage(operation);
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    });
  });
});

describe("getFailureMessage", () => {
  it("should return correct failure message for basic CRUD operations", () => {
    expect(getFailureMessage("create")).toBe("创建失败");
    expect(getFailureMessage("update")).toBe("更新失败");
    expect(getFailureMessage("delete")).toBe("删除失败");
    expect(getFailureMessage("read")).toBe("查询失败");
  });

  it("should return correct failure message for extended operations", () => {
    expect(getFailureMessage("query")).toBe("查询失败");
    expect(getFailureMessage("import")).toBe("导入失败");
    expect(getFailureMessage("export")).toBe("导出失败");
    expect(getFailureMessage("sync")).toBe("同步失败");
    expect(getFailureMessage("validate")).toBe("数据验证失败");
  });

  it("should return default message for unknown operations", () => {
    // @ts-ignore - Testing runtime behavior
    expect(getFailureMessage("unknown_operation")).toBe("处理失败");
  });
});

describe("isQueryOperation", () => {
  it("should return true for query operations", () => {
    expect(isQueryOperation("read")).toBe(true);
    expect(isQueryOperation("query")).toBe(true);
    expect(isQueryOperation("search")).toBe(true);
    expect(isQueryOperation("filter")).toBe(true);
    expect(isQueryOperation("aggregate")).toBe(true);
  });

  it("should return false for non-query operations", () => {
    expect(isQueryOperation("create")).toBe(false);
    expect(isQueryOperation("update")).toBe(false);
    expect(isQueryOperation("delete")).toBe(false);
    expect(isQueryOperation("import")).toBe(false);
  });

  it("should handle unknown operations", () => {
    // @ts-ignore - Testing runtime behavior
    expect(isQueryOperation("unknown_operation")).toBe(false);
  });
});

describe("isMutationOperation", () => {
  it("should return true for mutation operations", () => {
    expect(isMutationOperation("create")).toBe(true);
    expect(isMutationOperation("update")).toBe(true);
    expect(isMutationOperation("delete")).toBe(true);
    expect(isMutationOperation("batch_create")).toBe(true);
    expect(isMutationOperation("batch_update")).toBe(true);
    expect(isMutationOperation("batch_delete")).toBe(true);
    expect(isMutationOperation("import")).toBe(true);
    expect(isMutationOperation("sync")).toBe(true);
    expect(isMutationOperation("backup")).toBe(true);
    expect(isMutationOperation("restore")).toBe(true);
    expect(isMutationOperation("cleanup")).toBe(true);
  });

  it("should return false for non-mutation operations", () => {
    expect(isMutationOperation("read")).toBe(false);
    expect(isMutationOperation("query")).toBe(false);
    expect(isMutationOperation("search")).toBe(false);
    expect(isMutationOperation("validate")).toBe(false);
  });
});

describe("isBatchOperation", () => {
  it('should return true for operations starting with "batch_"', () => {
    expect(isBatchOperation("batch_create")).toBe(true);
    expect(isBatchOperation("batch_update")).toBe(true);
    expect(isBatchOperation("batch_delete")).toBe(true);
  });

  it("should return true for bulk operations", () => {
    expect(isBatchOperation("import")).toBe(true);
    expect(isBatchOperation("export")).toBe(true);
    expect(isBatchOperation("sync")).toBe(true);
    expect(isBatchOperation("cleanup")).toBe(true);
  });

  it("should return false for single-item operations", () => {
    expect(isBatchOperation("create")).toBe(false);
    expect(isBatchOperation("update")).toBe(false);
    expect(isBatchOperation("delete")).toBe(false);
    expect(isBatchOperation("read")).toBe(false);
    expect(isBatchOperation("query")).toBe(false);
  });
});

describe("shouldRefreshData", () => {
  it("should return true for states that require refresh", () => {
    expect(shouldRefreshData("stale")).toBe(true);
    expect(shouldRefreshData("dirty")).toBe(true);
    expect(shouldRefreshData("corrupted")).toBe(true);
  });

  it("should return false for states that do not require refresh", () => {
    expect(shouldRefreshData("fresh")).toBe(false);
    expect(shouldRefreshData("cached")).toBe(false);
    expect(shouldRefreshData("persisted")).toBe(false);
    expect(shouldRefreshData("synchronized")).toBe(false);
    expect(shouldRefreshData("pending")).toBe(false);
    expect(shouldRefreshData("processing")).toBe(false);
  });
});

describe("getPriorityWeight", () => {
  it("should return correct weights for all priority levels", () => {
    expect(getPriorityWeight("critical")).toBe(100);
    expect(getPriorityWeight("high")).toBe(80);
    expect(getPriorityWeight("medium")).toBe(60);
    expect(getPriorityWeight("low")).toBe(40);
    expect(getPriorityWeight("background")).toBe(20);
  });

  it("should return weights in descending order", () => {
    const critical = getPriorityWeight("critical");
    const high = getPriorityWeight("high");
    const medium = getPriorityWeight("medium");
    const low = getPriorityWeight("low");
    const background = getPriorityWeight("background");

    expect(critical).toBeGreaterThan(high);
    expect(high).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(background);
  });

  it("should handle all defined priority levels", () => {
    const priorities = Object.values(OPERATION_CONSTANTS.PRIORITY_LEVELS);
    priorities.forEach((priority) => {
      const weight = getPriorityWeight(priority);
      expect(typeof weight).toBe("number");
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(100);
    });
  });
});
