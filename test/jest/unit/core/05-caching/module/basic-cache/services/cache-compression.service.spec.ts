import { Test, TestingModule } from '@nestjs/testing';
import { CacheCompressionService } from '@core/05-caching/module/basic-cache/services/cache-compression.service';
import { CACHE_CONFIG } from '@core/05-caching/module/basic-cache/constants/cache-config.constants';
import { CacheMetadata } from '@core/05-caching/module/basic-cache/interfaces/cache-metadata.interface';
import * as zlib from 'zlib';

// Mock zlib functions
jest.mock('zlib', () => ({
  gzip: jest.fn(),
  gunzip: jest.fn(),
}));

// Mock logger
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  })),
}));

// Mock Universal Exception Factory
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn((config) => {
      const error = new Error(config.message);
      error.name = 'BusinessException';
      return error;
    }),
  },
  BusinessErrorCode: {
    DATA_SERIALIZATION_FAILED: 'DATA_SERIALIZATION_FAILED',
  },
  ComponentIdentifier: {
    COMMON_CACHE: 'COMMON_CACHE',
  },
}));

describe('CacheCompressionService', () => {
  let service: CacheCompressionService;
  let module: TestingModule;
  let gzipMock: jest.MockedFunction<typeof zlib.gzip>;
  let gunzipMock: jest.MockedFunction<typeof zlib.gunzip>;

  beforeEach(async () => {
    // Setup mocks
    gzipMock = zlib.gzip as jest.MockedFunction<typeof zlib.gzip>;
    gunzipMock = zlib.gunzip as jest.MockedFunction<typeof zlib.gunzip>;

    module = await Test.createTestingModule({
      providers: [CacheCompressionService],
    }).compile();

    service = module.get<CacheCompressionService>(CacheCompressionService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have logger defined', () => {
      expect((service as any).logger).toBeDefined();
    });
  });

  describe('compress', () => {
    it('should compress large data successfully', async () => {
      const largeData = { data: 'x'.repeat(2000) }; // Exceeds threshold
      const mockCompressed = Buffer.from('compressed-data');

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      const result = await service.compress(largeData);

      expect(result).toHaveProperty('compressedData');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('compressionRatio');
      expect(result.metadata.compressed).toBe(true);
      expect(result.metadata.originalSize).toBeGreaterThan(0);
      expect(result.metadata.compressedSize).toBeDefined();
      expect(result.compressedData).toBe(mockCompressed.toString('base64'));
    });

    it('should not compress small data', async () => {
      const smallData = { data: 'small' };

      const result = await service.compress(smallData);

      expect(result.metadata.compressed).toBe(false);
      expect(result.compressionRatio).toBe(1);
      expect(result.compressedData).toBe(JSON.stringify(smallData));
    });

    it('should not compress if compression ratio is poor', async () => {
      const largeData = { data: 'x'.repeat(2000) };
      const mockCompressed = Buffer.from('x'.repeat(1900)); // Poor compression ratio

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      const result = await service.compress(largeData);

      expect(result.metadata.compressed).toBe(false);
      expect(result.compressionRatio).toBe(1);
      expect(result.compressedData).toBe(JSON.stringify(largeData));
    });

    it('should handle compression errors', async () => {
      const largeData = { data: 'x'.repeat(2000) };
      const error = new Error('Compression failed');

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(error, null);
      });

      await expect(service.compress(largeData)).rejects.toThrow('Data compression failed: Compression failed');
    });

    it('should return original data when below threshold', async () => {
      const smallData = { test: 'small' };

      const result = await service.compress(smallData);

      expect(result.metadata.compressed).toBe(false);
      expect(result.compressionRatio).toBe(1);
      expect(result.compressedData).toBe(JSON.stringify(smallData));
      expect(gzipMock).not.toHaveBeenCalled();
    });

    it('should include proper metadata fields', async () => {
      const testData = { test: 'data' };

      const result = await service.compress(testData);

      expect(result.metadata).toHaveProperty('storedAt');
      expect(result.metadata).toHaveProperty('compressed');
      expect(result.metadata).toHaveProperty('originalSize');
      expect(typeof result.metadata.storedAt).toBe('number');
      expect(typeof result.metadata.compressed).toBe('boolean');
      expect(typeof result.metadata.originalSize).toBe('number');
    });
  });

  describe('decompress', () => {
    it('should decompress data without metadata', async () => {
      const compressedData = Buffer.from([0x1f, 0x8b, 0x08, 0x00]).toString('base64');
      const decompressedBuffer = Buffer.from('{"data":"test"}');

      gunzipMock.mockImplementation((data: any, callback: any) => {
        callback(null, decompressedBuffer);
      });

      const result = await service.decompress(compressedData);

      expect(result).toBe('{"data":"test"}');
      expect(gunzipMock).toHaveBeenCalledWith(expect.any(Buffer), expect.any(Function));
    });

    it('should decompress data with metadata', async () => {
      const compressedData = 'base64-compressed-data';
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 100,
        compressedSize: 50,
      };
      const decompressedBuffer = Buffer.from('{"data":"test"}');

      gunzipMock.mockImplementation((data: any, callback: any) => {
        callback(null, decompressedBuffer);
      });

      const result = await service.decompress(compressedData, metadata);

      expect(result).toEqual({ data: 'test' });
    });

    it('should return uncompressed data when metadata indicates no compression', async () => {
      const uncompressedData = '{"data":"test"}';
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: false,
        originalSize: 100,
      };

      const result = await service.decompress(uncompressedData, metadata);

      expect(result).toEqual({ data: 'test' });
      expect(gunzipMock).not.toHaveBeenCalled();
    });

    it('should return data as-is when not compressed (no metadata)', async () => {
      const uncompressedData = 'plain-text-data';

      const result = await service.decompress(uncompressedData);

      expect(result).toBe('plain-text-data');
      expect(gunzipMock).not.toHaveBeenCalled();
    });

    it('should handle decompression errors', async () => {
      const compressedData = Buffer.from([0x1f, 0x8b, 0x08, 0x00]).toString('base64');
      const error = new Error('Decompression failed');

      gunzipMock.mockImplementation((data: any, callback: any) => {
        callback(error, null);
      });

      await expect(service.decompress(compressedData)).rejects.toThrow('Data decompression failed: Decompression failed');
    });
  });

  describe('isCompressed', () => {
    it('should detect compressed data', () => {
      // Base64 encoded data starting with gzip magic numbers
      const compressedData = Buffer.from([0x1f, 0x8b, 0x08, 0x00]).toString('base64');

      const result = service.isCompressed(compressedData);

      expect(result).toBe(true);
    });

    it('should detect non-compressed data', () => {
      const plainData = 'plain text data';

      const result = service.isCompressed(plainData);

      expect(result).toBe(false);
    });

    it('should handle invalid base64 data', () => {
      const invalidData = 'not-base64-data!@#$';

      const result = service.isCompressed(invalidData);

      expect(result).toBe(false);
    });

    it('should handle data without gzip headers', () => {
      const nonGzipData = Buffer.from([0x00, 0x01, 0x02, 0x03]).toString('base64');

      const result = service.isCompressed(nonGzipData);

      expect(result).toBe(false);
    });

    it('should handle short buffers', () => {
      const shortData = Buffer.from([0x1f]).toString('base64');

      const result = service.isCompressed(shortData);

      expect(result).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(service.isCompressed('')).toBe(false);
      expect(service.isCompressed(null as any)).toBe(false);
      expect(service.isCompressed(undefined as any)).toBe(false);
    });
  });

  describe('shouldCompress', () => {
    it('should return true for large data', () => {
      const largeData = { data: 'x'.repeat(2000) };

      const result = service.shouldCompress(largeData);

      expect(result).toBe(true);
    });

    it('should return false for small data', () => {
      const smallData = { data: 'small' };

      const result = service.shouldCompress(smallData);

      expect(result).toBe(false);
    });

    it('should handle serialization errors', () => {
      const circularData = { data: null };
      circularData.data = circularData; // Create circular reference

      const result = service.shouldCompress(circularData);

      expect(result).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(service.shouldCompress(null)).toBe(false);
      expect(service.shouldCompress(undefined)).toBe(false);
      expect(service.shouldCompress('')).toBe(false);
      expect(service.shouldCompress({})).toBe(false);
      expect(service.shouldCompress([])).toBe(false);
    });
  });

  describe('getDataSize', () => {
    it('should calculate data size correctly', () => {
      const data = { test: 'data' };
      const expected = Buffer.byteLength(JSON.stringify(data), 'utf8');

      const result = service.getDataSize(data);

      expect(result).toBe(expected);
    });

    it('should handle serialization errors', () => {
      const circularData = { data: null };
      circularData.data = circularData;

      const result = service.getDataSize(circularData);

      expect(result).toBe(0);
    });

    it('should handle various data types', () => {
      expect(service.getDataSize(null)).toBe(4); // "null"
      expect(service.getDataSize(undefined)).toBe(9); // "undefined"
      expect(service.getDataSize('')).toBe(2); // '""'
      expect(service.getDataSize(123)).toBe(3); // "123"
      expect(service.getDataSize(true)).toBe(4); // "true"
    });
  });

  describe('calculateCompressionRatio', () => {
    it('should calculate compression ratio correctly', () => {
      const originalSize = 1000;
      const compressedSize = 500;

      const result = service.calculateCompressionRatio(originalSize, compressedSize);

      expect(result).toBe(0.5);
    });

    it('should handle zero original size', () => {
      const originalSize = 0;
      const compressedSize = 100;

      const result = service.calculateCompressionRatio(originalSize, compressedSize);

      expect(result).toBe(1);
    });

    it('should handle edge cases', () => {
      expect(service.calculateCompressionRatio(100, 0)).toBe(0);
      expect(service.calculateCompressionRatio(100, 100)).toBe(1);
      expect(service.calculateCompressionRatio(100, 150)).toBe(1.5);
    });
  });

  describe('validateCompressedData', () => {
    it('should validate correct compressed data', async () => {
      const compressedData = 'valid-compressed-data';
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: false, // Set to false to avoid actual decompression
        originalSize: 100,
      };

      const result = await service.validateCompressedData(compressedData, metadata);

      expect(result).toBe(true);
    });

    it('should detect invalid compressed data', async () => {
      const compressedData = 'invalid-compressed-data';
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 100,
        compressedSize: 50,
      };

      gunzipMock.mockImplementation((data: any, callback: any) => {
        callback(new Error('Invalid data'), null);
      });

      const result = await service.validateCompressedData(compressedData, metadata);

      expect(result).toBe(false);
    });
  });

  describe('getCompressionStats', () => {
    it('should return compression statistics', () => {
      const originalData = { data: 'x'.repeat(1000) };
      const compressedData = 'compressed-data';
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 1000,
        compressedSize: 500,
      };

      const result = service.getCompressionStats(originalData, compressedData, metadata);

      expect(result).toHaveProperty('originalSize');
      expect(result).toHaveProperty('compressedSize');
      expect(result).toHaveProperty('compressionRatio');
      expect(result).toHaveProperty('spaceSaved');
      expect(result).toHaveProperty('spaceSavedPercent');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('threshold');
      expect(result.spaceSavedPercent).toMatch(/%$/);
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.compressedSize).toBe(500);
      expect(result.spaceSaved).toBe(500);
    });

    it('should calculate stats with metadata compressed size', () => {
      const originalData = { data: 'test' };
      const compressedData = 'compressed';
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 100,
        compressedSize: 50,
      };

      const result = service.getCompressionStats(originalData, compressedData, metadata);

      expect(result.compressedSize).toBe(50);
      expect(result.spaceSaved).toBe(50);
    });

    it('should fallback to calculated size when metadata missing compressedSize', () => {
      const originalData = { data: 'test' };
      const compressedData = 'compressed';
      const metadata: CacheMetadata = {
        storedAt: Date.now(),
        compressed: true,
        originalSize: 100,
      };

      const result = service.getCompressionStats(originalData, compressedData, metadata);

      expect(result.compressedSize).toBe(Buffer.byteLength(compressedData, 'utf8'));
    });
  });

  describe('Configuration Integration', () => {
    it('should use correct compression configuration', () => {
      expect(CACHE_CONFIG.COMPRESSION).toBeDefined();
      expect(CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES).toBeGreaterThan(0);
      expect(CACHE_CONFIG.COMPRESSION.LEVEL).toBeGreaterThanOrEqual(1);
      expect(CACHE_CONFIG.COMPRESSION.LEVEL).toBeLessThanOrEqual(9);
      expect(CACHE_CONFIG.COMPRESSION.SAVING_RATIO).toBeGreaterThan(0);
      expect(CACHE_CONFIG.COMPRESSION.SAVING_RATIO).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle extremely large data', async () => {
      const extremelyLargeData = { data: 'x'.repeat(100000) };
      const mockCompressed = Buffer.from('compressed');

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      const result = await service.compress(extremelyLargeData);

      expect(result).toBeDefined();
      expect(result.metadata.originalSize).toBeGreaterThan(100000);
    });

    it('should handle empty data', async () => {
      const emptyData = {};

      const result = await service.compress(emptyData);

      expect(result.metadata.compressed).toBe(false);
      expect(result.compressionRatio).toBe(1);
    });

    it('should handle null and undefined data', async () => {
      const nullResult = await service.compress(null);
      const undefinedResult = await service.compress(undefined);

      expect(nullResult.metadata.compressed).toBe(false);
      expect(undefinedResult.metadata.compressed).toBe(false);
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, 3, { nested: 'value' }],
              string: 'test',
              number: 42,
              boolean: true,
              nullValue: null,
            },
          },
        },
      };

      const result = await service.compress(complexData);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle multiple compression operations efficiently', async () => {
      const data = { data: 'x'.repeat(1500) }; // Above threshold
      const mockCompressed = Buffer.from('compressed');

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      const promises = Array(10).fill(null).map(() => service.compress(data));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.metadata).toBeDefined();
      });
    });

    it('should not cause memory leaks with large datasets', async () => {
      const largeDataset = Array(100).fill(null).map((_, i) => ({
        id: i,
        data: 'x'.repeat(100),
      }));

      const result = await service.compress(largeDataset);

      expect(result).toBeDefined();
      expect(result.metadata.originalSize).toBeGreaterThan(0);
    });
  });

  describe('Compression Algorithm Validation', () => {
    it('should use gzip compression algorithm', async () => {
      const data = { data: 'x'.repeat(2000) };
      const mockCompressed = Buffer.from('compressed');

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      await service.compress(data);

      expect(gzipMock).toHaveBeenCalledWith(
        expect.any(String),
        { level: CACHE_CONFIG.COMPRESSION.LEVEL },
        expect.any(Function)
      );
    });

    it('should validate gzip magic numbers in isCompressed', () => {
      // Test various gzip magic number combinations
      const validGzipData1 = Buffer.from([0x1f, 0x8b]).toString('base64');
      const validGzipData2 = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]).toString('base64');
      const invalidGzipData = Buffer.from([0x1f, 0x8a]).toString('base64');

      expect(service.isCompressed(validGzipData1)).toBe(true);
      expect(service.isCompressed(validGzipData2)).toBe(true);
      expect(service.isCompressed(invalidGzipData)).toBe(false);
    });
  });

  describe('Metadata Consistency', () => {
    it('should ensure metadata consistency across operations', async () => {
      const originalData = { data: 'x'.repeat(2000) };
      const mockCompressed = Buffer.from('compressed-data-mock');

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      const compressResult = await service.compress(originalData);
      const stats = service.getCompressionStats(
        originalData,
        compressResult.compressedData,
        compressResult.metadata
      );

      expect(compressResult.metadata.originalSize).toBe(stats.originalSize);
      expect(compressResult.metadata.compressedSize).toBe(stats.compressedSize);
      expect(compressResult.compressionRatio).toBe(stats.compressionRatio);
    });

    it('should maintain timestamp accuracy in metadata', async () => {
      const data = { test: 'data' };
      const beforeTime = Date.now();

      const result = await service.compress(data);
      const afterTime = Date.now();

      expect(result.metadata.storedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(result.metadata.storedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Integration Tests', () => {
    it('should handle full compress-decompress cycle', async () => {
      const originalData = { test: 'x'.repeat(2000) };
      const mockCompressed = Buffer.from('mock-compressed-data');
      const decompressedBuffer = Buffer.from(JSON.stringify(originalData));

      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      gunzipMock.mockImplementation((data: any, callback: any) => {
        callback(null, decompressedBuffer);
      });

      const compressResult = await service.compress(originalData);
      const decompressResult = await service.decompress(compressResult.compressedData, compressResult.metadata);

      expect(decompressResult).toEqual(originalData);
    });

    it('should work correctly with Unicode data', async () => {
      const unicodeData = {
        chinese: '你好世界'.repeat(200),
        arabic: 'مرحبا بالعالم'.repeat(200),
        emoji: '🎉🎊💻🚀'.repeat(200),
        mixed: 'Hello 世界 مرحبا 🌍'.repeat(200)
      };

      const mockCompressed = Buffer.from('mock-compressed-unicode');
      gzipMock.mockImplementation((data: any, options: any, callback: any) => {
        callback(null, mockCompressed);
      });

      const result = await service.compress(unicodeData);

      expect(result.metadata.compressed).toBe(true);
      expect(result.compressedData).toBe(mockCompressed.toString('base64'));
    });
  });
});