// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getModelToken } from "@nestjs/mongoose";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SecurityScanResultRepository } from "../../../../../src/security/repositories/security-scan-result.repository";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SecurityScanResult } from "../../../../../src/security/schemas/security-scan-result.schema";

// Mock class for the Mongoose model
class MockScanResultModel {
  constructor(private _data: any) {}
  save = jest.fn().mockResolvedValue(this._data);
  static find = jest.fn();
  static sort = jest.fn();
  static limit = jest.fn();
  static lean = jest.fn();
  static exec = jest.fn();
}

// Set up the chainable methods
MockScanResultModel.find.mockReturnThis();
MockScanResultModel.sort.mockReturnThis();
MockScanResultModel.limit.mockReturnThis();
MockScanResultModel.lean.mockReturnThis();

describe("SecurityScanResultRepository", () => {
  let repository: SecurityScanResultRepository;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let model: any;

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityScanResultRepository,
        {
          provide: getModelToken(SecurityScanResult.name),
          useValue: MockScanResultModel,
        },
      ],
    }).compile();

    repository = module.get<SecurityScanResultRepository>(
      SecurityScanResultRepository,
    );
    model = module.get(getModelToken(SecurityScanResult.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("create", () => {
    it("should create and save a scan result", async () => {
      const scanResultData = { scanner: "test-scanner", findings: [] };
      const result = await repository.create(scanResultData as any);
      expect((result as any).scanner).toBe("test-scanner");
    });
  });

  describe("findMostRecent", () => {
    it("should find most recent scan results", async () => {
      const mockResult = [{ scanner: "test", findings: [] }];
      MockScanResultModel.exec.mockResolvedValue(mockResult);

      const result = await repository.findMostRecent(5);

      expect(MockScanResultModel.find).toHaveBeenCalled();
      expect(MockScanResultModel.sort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(MockScanResultModel.limit).toHaveBeenCalledWith(5);
      expect(MockScanResultModel.lean).toHaveBeenCalled();
      expect(MockScanResultModel.exec).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
