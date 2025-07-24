import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { NotFoundException } from "@nestjs/common";
import { Model } from "mongoose";

import { AlertRuleRepository } from "../../../../../src/alert/repositories/alert-rule.repository";
import { AlertRule } from "../../../../../src/alert/schemas";
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from "../../../../../src/alert/dto";
import { IAlertRule } from "../../../../../src/alert/interfaces/alert.interface";

// Mock logger
jest.mock("../../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe("AlertRuleRepository", () => {
  let repository: AlertRuleRepository;
  let mockModel: any;

  const mockAlertRule: IAlertRule = {
    id: "rule-123",
    name: "Test Alert Rule",
    metric: "cpu_usage",
    operator: "gt",
    threshold: 80,
    duration: 300,
    severity: "critical",
    enabled: true,
    channels: [],
    cooldown: 600,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  const createRuleDto: CreateAlertRuleDto & { id: string } = {
    id: "rule-123",
    name: "Test Alert Rule",
    metric: "cpu_usage",
    operator: "gt",
    threshold: 80,
    duration: 300,
    severity: "critical",
    enabled: true,
    channels: [],
    cooldown: 600,
  };

  const updateRuleDto: UpdateAlertRuleDto = {
    name: "Updated Alert Rule",
    threshold: 90,
  };

  beforeEach(async () => {
    // Create comprehensive mock for Mongoose Model
    mockModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({
        ...data,
        toObject: jest.fn().mockReturnValue(data),
      }),
    })) as any;

    // Add query methods
    Object.assign(mockModel, {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      findOneAndUpdate: jest.fn().mockReturnThis(),
      updateOne: jest.fn().mockReturnThis(),
      deleteOne: jest.fn().mockReturnThis(),
      countDocuments: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      create: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleRepository,
        {
          provide: getModelToken(AlertRule.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<AlertRuleRepository>(AlertRuleRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new alert rule successfully", async () => {
      // Mock the model constructor and save method
      const mockSave = jest.fn().mockResolvedValue({
        ...createRuleDto,
        toObject: jest.fn().mockReturnValue(mockAlertRule),
      });

      mockModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await repository.create(createRuleDto);

      expect(mockModel).toHaveBeenCalledWith(createRuleDto);
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockAlertRule);
    });

    it("should handle creation errors", async () => {
      const error = new Error("Database error");
      mockModel.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(error),
      }));

      await expect(repository.create(createRuleDto)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("update", () => {
    it("should update an existing alert rule successfully", async () => {
      mockModel.exec.mockResolvedValue(mockAlertRule);

      const result = await repository.update("rule-123", updateRuleDto);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: "rule-123" },
        { ...updateRuleDto, updatedAt: expect.any(Date) },
        { new: true },
      );
      expect(mockModel.lean).toHaveBeenCalled();
      expect(mockModel.exec).toHaveBeenCalled();
      expect(result).toEqual(mockAlertRule);
    });

    it("should throw NotFoundException when rule does not exist", async () => {
      mockModel.exec.mockResolvedValue(null);

      await expect(
        repository.update("nonexistent", updateRuleDto),
      ).rejects.toThrow(NotFoundException);

      await expect(
        repository.update("nonexistent", updateRuleDto),
      ).rejects.toThrow("未找到ID为 nonexistent 的规则");
    });

    it("should handle update database errors", async () => {
      const error = new Error("Update failed");
      mockModel.exec.mockRejectedValue(error);

      await expect(
        repository.update("rule-123", updateRuleDto),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("delete", () => {
    it("should delete an existing rule successfully", async () => {
      mockModel.exec.mockResolvedValue({ deletedCount: 1 });

      const result = await repository.delete("rule-123");

      expect(mockModel.deleteOne).toHaveBeenCalledWith({ id: "rule-123" });
      expect(mockModel.exec).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false when rule does not exist", async () => {
      mockModel.exec.mockResolvedValue({ deletedCount: 0 });

      const result = await repository.delete("nonexistent");

      expect(result).toBe(false);
    });

    it("should handle deletion database errors", async () => {
      const error = new Error("Delete failed");
      mockModel.exec.mockRejectedValue(error);

      await expect(repository.delete("rule-123")).rejects.toThrow(
        "Delete failed",
      );
    });
  });

  describe("findAll", () => {
    it("should return all alert rules", async () => {
      const mockRules = [mockAlertRule, { ...mockAlertRule, id: "rule-456" }];
      mockModel.exec.mockResolvedValue(mockRules);

      const result = await repository.findAll();

      expect(mockModel.find).toHaveBeenCalledWith();
      expect(mockModel.lean).toHaveBeenCalled();
      expect(mockModel.exec).toHaveBeenCalled();
      expect(result).toEqual(mockRules);
    });

    it("should return empty array when no rules exist", async () => {
      mockModel.exec.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("should handle findAll database errors", async () => {
      const error = new Error("Find failed");
      mockModel.exec.mockRejectedValue(error);

      await expect(repository.findAll()).rejects.toThrow("Find failed");
    });
  });

  describe("findAllEnabled", () => {
    it("should return only enabled alert rules", async () => {
      const enabledRules = [mockAlertRule];
      mockModel.exec.mockResolvedValue(enabledRules);

      const result = await repository.findAllEnabled();

      expect(mockModel.find).toHaveBeenCalledWith({ enabled: true });
      expect(mockModel.lean).toHaveBeenCalled();
      expect(mockModel.exec).toHaveBeenCalled();
      expect(result).toEqual(enabledRules);
    });

    it("should return empty array when no enabled rules exist", async () => {
      mockModel.exec.mockResolvedValue([]);

      const result = await repository.findAllEnabled();

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should find and return rule by id", async () => {
      mockModel.exec.mockResolvedValue(mockAlertRule);

      const result = await repository.findById("rule-123");

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: "rule-123" });
      expect(mockModel.lean).toHaveBeenCalled();
      expect(mockModel.exec).toHaveBeenCalled();
      expect(result).toEqual(mockAlertRule);
    });

    it("should return null when rule does not exist", async () => {
      mockModel.exec.mockResolvedValue(null);

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle findById database errors", async () => {
      const error = new Error("Find by id failed");
      mockModel.exec.mockRejectedValue(error);

      await expect(repository.findById("rule-123")).rejects.toThrow(
        "Find by id failed",
      );
    });
  });

  describe("toggle", () => {
    it("should enable a rule successfully", async () => {
      mockModel.exec.mockResolvedValue({ modifiedCount: 1 });

      const result = await repository.toggle("rule-123", true);

      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { id: "rule-123" },
        { enabled: true, updatedAt: expect.any(Date) },
      );
      expect(result).toBe(true);
    });

    it("should disable a rule successfully", async () => {
      mockModel.exec.mockResolvedValue({ modifiedCount: 1 });

      const result = await repository.toggle("rule-123", false);

      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { id: "rule-123" },
        { enabled: false, updatedAt: expect.any(Date) },
      );
      expect(result).toBe(true);
    });

    it("should return false when rule does not exist", async () => {
      mockModel.exec.mockResolvedValue({ modifiedCount: 0 });

      const result = await repository.toggle("nonexistent", true);

      expect(result).toBe(false);
    });

    it("should handle toggle database errors", async () => {
      const error = new Error("Toggle failed");
      mockModel.exec.mockRejectedValue(error);

      await expect(repository.toggle("rule-123", true)).rejects.toThrow(
        "Toggle failed",
      );
    });
  });

  describe("countAll", () => {
    it("should return total count of all rules", async () => {
      mockModel.exec.mockResolvedValue(5);

      const result = await repository.countAll();

      expect(mockModel.countDocuments).toHaveBeenCalledWith();
      expect(mockModel.exec).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it("should return 0 when no rules exist", async () => {
      mockModel.exec.mockResolvedValue(0);

      const result = await repository.countAll();

      expect(result).toBe(0);
    });

    it("should handle count database errors", async () => {
      const error = new Error("Count failed");
      mockModel.exec.mockRejectedValue(error);

      await expect(repository.countAll()).rejects.toThrow("Count failed");
    });
  });

  describe("countEnabled", () => {
    it("should return count of enabled rules", async () => {
      mockModel.exec.mockResolvedValue(3);

      const result = await repository.countEnabled();

      expect(mockModel.countDocuments).toHaveBeenCalledWith({ enabled: true });
      expect(mockModel.exec).toHaveBeenCalled();
      expect(result).toBe(3);
    });

    it("should return 0 when no enabled rules exist", async () => {
      mockModel.exec.mockResolvedValue(0);

      const result = await repository.countEnabled();

      expect(result).toBe(0);
    });

    it("should handle countEnabled database errors", async () => {
      const error = new Error("Count enabled failed");
      mockModel.exec.mockRejectedValue(error);

      await expect(repository.countEnabled()).rejects.toThrow(
        "Count enabled failed",
      );
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle undefined updateRuleDto gracefully", async () => {
      mockModel.exec.mockResolvedValue(mockAlertRule);

      const result = await repository.update(
        "rule-123",
        {} as UpdateAlertRuleDto,
      );

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: "rule-123" },
        { updatedAt: expect.any(Date) },
        { new: true },
      );
      expect(result).toEqual(mockAlertRule);
    });

    it("should handle empty string rule ids", async () => {
      mockModel.exec.mockResolvedValue(null);

      const result = await repository.findById("");

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: "" });
      expect(result).toBeNull();
    });

    it("should handle special characters in rule ids", async () => {
      const specialId = "rule-!@#$%^&*()";
      mockModel.exec.mockResolvedValue(mockAlertRule);

      await repository.findById(specialId);

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: specialId });
    });

    it("should preserve data types in create operation", async () => {
      const ruleWithTypes = {
        ...createRuleDto,
        threshold: 85.5, // float
        duration: 300, // integer
        enabled: false, // boolean
      };

      const mockSave = jest.fn().mockResolvedValue({
        ...ruleWithTypes,
        toObject: jest.fn().mockReturnValue(ruleWithTypes),
      });

      mockModel.mockImplementation(() => ({
        save: mockSave,
      }));

      await repository.create(ruleWithTypes);

      expect(mockModel).toHaveBeenCalledWith(ruleWithTypes);
    });
  });
});
