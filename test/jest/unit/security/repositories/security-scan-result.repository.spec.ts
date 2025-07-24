
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SecurityScanResultRepository } from '../../../../../src/security/repositories/security-scan-result.repository';
import { SecurityScanResult, SecurityScanResultDocument } from '../../../../../src/security/schemas/security-scan-result.schema';

// Mock class for the Mongoose model
class MockScanResultModel {
  constructor(private data: any) {}
  save = jest.fn().mockResolvedValue(this.data);
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

describe('SecurityScanResultRepository', () => {
  let repository: SecurityScanResultRepository;
  let model: typeof MockScanResultModel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityScanResultRepository,
        {
          provide: getModelToken(SecurityScanResult.name),
          useValue: MockScanResultModel,
        },
      ],
    }).compile();

    repository = module.get<SecurityScanResultRepository>(SecurityScanResultRepository);
    model = module.get(getModelToken(SecurityScanResult.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a scan result', async () => {
      const scanResultData = { scanner: 'test-scanner', findings: [] };
      const result = await repository.create(scanResultData as any);
      expect((result as any).scanner).toBe('test-scanner');
    });
  });

  describe('findMostRecent', () => {
    it('should find most recent scan results', async () => {
      const mockResult = [{ scanner: 'test', findings: [] }];
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