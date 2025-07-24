import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { SecurityAuditLogRepository } from "../../../../../src/security/repositories/security-audit-log.repository";
import {
  SecurityAuditLog,
  SecurityAuditLogDocument,
} from "../../../../../src/security/schemas/security-audit-log.schema";

describe("SecurityAuditLogRepository", () => {
  let repository: SecurityAuditLogRepository;
  let model: Model<SecurityAuditLogDocument>;

  const mockAuditLogModel = {
    insertMany: jest.fn(),
    find: jest.fn(),
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditLogRepository,
        {
          provide: getModelToken(SecurityAuditLog.name),
          useValue: mockAuditLogModel,
        },
      ],
    }).compile();

    repository = module.get<SecurityAuditLogRepository>(
      SecurityAuditLogRepository,
    );
    model = module.get<Model<SecurityAuditLogDocument>>(
      getModelToken(SecurityAuditLog.name),
    );

    // Chain mock setup for findWithFilters
    mockAuditLogModel.find.mockReturnThis();
    mockAuditLogModel.sort.mockReturnThis();
    mockAuditLogModel.skip.mockReturnThis();
    mockAuditLogModel.limit.mockReturnThis();
    mockAuditLogModel.lean.mockReturnThis();
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("insertMany", () => {
    it("should insert logs successfully", async () => {
      const logs = [{ type: "login", userId: "user1" }];
      await repository.insertMany(logs as any);
      expect(model.insertMany).toHaveBeenCalledWith(logs);
    });

    it("should throw an error if insertion fails", async () => {
      const logs = [{ type: "login", userId: "user1" }];
      const error = new Error("Insert failed");
      mockAuditLogModel.insertMany.mockRejectedValue(error);
      await expect(repository.insertMany(logs as any)).rejects.toThrow(error);
    });
  });

  describe("findWithFilters", () => {
    it("should find logs with no filters", async () => {
      mockAuditLogModel.exec.mockResolvedValue([]);
      await repository.findWithFilters();
      expect(mockAuditLogModel.find).toHaveBeenCalledWith({});
      expect(mockAuditLogModel.exec).toHaveBeenCalled();
    });

    it("should apply all filters correctly", async () => {
      const filters = {
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-01-31"),
        type: "login",
        severity: "high",
        clientIP: "127.0.0.1",
        userId: "user-1",
        outcome: "success",
      };
      mockAuditLogModel.exec.mockResolvedValue([]);
      await repository.findWithFilters(filters);
      expect(mockAuditLogModel.find).toHaveBeenCalledWith({
        timestamp: { $gte: filters.startDate, $lte: filters.endDate },
        type: filters.type,
        severity: filters.severity,
        clientIP: filters.clientIP,
        userId: filters.userId,
        outcome: filters.outcome,
      });
    });

    it("should handle pagination correctly", async () => {
      await repository.findWithFilters({}, 50, 10);
      expect(mockAuditLogModel.limit).toHaveBeenCalledWith(50);
      expect(mockAuditLogModel.skip).toHaveBeenCalledWith(10);
    });
  });
});
