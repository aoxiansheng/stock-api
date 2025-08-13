/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Symbol Mapper Internal DTO UCK�
 * Kաh� ��pn ��a
 */

import { validate } from 'class-validator';
import {
  MappingConfigResultDto,
  SymbolMappingRuleContextDto,
  InternalSymbolMappingDto,
  SymbolMapperPerformanceDto,
  SymbolMapperApplicationResultDto,
  SymbolMapperTransformationLogDto,
  SymbolMapperDataSourceMappingLogDto,
  SymbolMapperBatchTransformationLogDto,
} from '../../../../../../../src/core/public/symbol-mapper/dto/symbol-mapper-internal.dto';

describe('Symbol Mapper Internal DTOs', () => {
  describe('MappingConfigResultDto', () => {
    let dto: MappingConfigResultDto;

    beforeEach(() => {
      dto = new MappingConfigResultDto();
    });

    describe('Valid Data', () => {
      it('should create instance with found mapping config', () => {
        // Arrange
        dto.found = true;
        dto.SymbolMappingRule = [];
        dto.dataSourceName = 'longport';

        // Assert
        expect(dto.found).toBe(true);
        expect(dto.SymbolMappingRule).toEqual([]);
        expect(dto.dataSourceName).toBe('longport');
      });

      it('should create instance with not found mapping config', () => {
        // Arrange
        dto.found = false;
        dto.SymbolMappingRule = [];

        // Assert
        expect(dto.found).toBe(false);
        expect(dto.SymbolMappingRule).toEqual([]);
        expect(dto.dataSourceName).toBeUndefined();
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.found = true;
        dto.SymbolMappingRule = [];

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation with invalid types', async () => {
        // Arrange
        dto.found = 'true' as any;
        dto.SymbolMappingRule = 'not an array' as any;
        dto.dataSourceName = 123 as any;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('SymbolMappingRuleContextDto', () => {
    let dto: SymbolMappingRuleContextDto;

    beforeEach(() => {
      dto = new SymbolMappingRuleContextDto();
    });

    describe('Valid Data', () => {
      it('should create instance with complete context', () => {
        // Arrange
        dto.source = 'longport';
        dto.mappingInSymbolId = 'mapping-rule-123';

        // Assert
        expect(dto.source).toBe('longport');
        expect(dto.mappingInSymbolId).toBe('mapping-rule-123');
      });

      it('should create instance with minimal data', () => {
        // Arrange
        dto.source = 'longport_sg';

        // Assert
        expect(dto.source).toBe('longport_sg');
        expect(dto.mappingInSymbolId).toBeUndefined();
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.source = 'itick';
        dto.mappingInSymbolId = 'rule-456';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation without required source', async () => {
        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('source');
      });
    });
  });

  describe('InternalSymbolMappingDto', () => {
    let dto: InternalSymbolMappingDto;

    beforeEach(() => {
      dto = new InternalSymbolMappingDto();
    });

    describe('Valid Data', () => {
      it('should create instance with complete mapping data', () => {
        // Arrange
        dto.standardSymbol = '00700.HK';
        dto.sdkSymbol = '00700';
        dto.isActive = true;
        dto.market = 'HK';
        dto.symbolType = 'stock';
        dto.note = 'Tencent Holdings Ltd';

        // Assert
        expect(dto.standardSymbol).toBe('00700.HK');
        expect(dto.sdkSymbol).toBe('00700');
        expect(dto.isActive).toBe(true);
        expect(dto.market).toBe('HK');
        expect(dto.symbolType).toBe('stock');
        expect(dto.note).toBe('Tencent Holdings Ltd');
      });

      it('should create instance with minimal required data', () => {
        // Arrange
        dto.standardSymbol = 'AAPL.US';
        dto.sdkSymbol = 'AAPL';

        // Assert
        expect(dto.standardSymbol).toBe('AAPL.US');
        expect(dto.sdkSymbol).toBe('AAPL');
        expect(dto.isActive).toBeUndefined();
        expect(dto.market).toBeUndefined();
        expect(dto.symbolType).toBeUndefined();
        expect(dto.note).toBeUndefined();
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.standardSymbol = 'GOOGL.US';
        dto.sdkSymbol = 'GOOGL';
        dto.isActive = false;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Invalid Data', () => {
      it('should fail validation without required fields', async () => {
        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(2);
        const properties = errors.map(error => error.property);
        expect(properties).toContain('standardSymbol');
        expect(properties).toContain('sdkSymbol');
      });
    });

    describe('Symbol Mapping Logic', () => {
      it('should handle HK stock mapping', () => {
        // Arrange
        dto.standardSymbol = '00700.HK';
        dto.sdkSymbol = '00700';
        dto.market = 'HK';
        dto.symbolType = 'stock';

        // Assert
        expect(dto.standardSymbol).toContain('.HK');
        expect(dto.sdkSymbol).not.toContain('.HK');
        expect(dto.market).toBe('HK');
      });

      it('should handle US stock mapping', () => {
        // Arrange
        dto.standardSymbol = 'AAPL.US';
        dto.sdkSymbol = 'AAPL';
        dto.market = 'US';
        dto.symbolType = 'stock';

        // Assert
        expect(dto.standardSymbol).toContain('.US');
        expect(dto.sdkSymbol).not.toContain('.US');
        expect(dto.market).toBe('US');
      });
    });
  });

  describe('SymbolMapperPerformanceDto', () => {
    let dto: SymbolMapperPerformanceDto;

    beforeEach(() => {
      dto = new SymbolMapperPerformanceDto();
    });

    describe('Valid Data', () => {
      it('should create instance with performance metrics', () => {
        // Arrange
        dto.processingTime = 150;
        dto.symbolsCount = 10;
        dto.isSlowMapping = false;
        dto.threshold = 1000;
        dto.avgTimePerSymbol = 15;

        // Assert
        expect(dto.processingTime).toBe(150);
        expect(dto.symbolsCount).toBe(10);
        expect(dto.isSlowMapping).toBe(false);
        expect(dto.threshold).toBe(1000);
        expect(dto.avgTimePerSymbol).toBe(15);
      });

      it('should identify slow mapping', () => {
        // Arrange
        dto.processingTime = 2500;
        dto.symbolsCount = 5;
        dto.isSlowMapping = true;
        dto.threshold = 1000;
        dto.avgTimePerSymbol = 500;

        // Assert
        expect(dto.processingTime).toBeGreaterThan(dto.threshold);
        expect(dto.isSlowMapping).toBe(true);
        expect(dto.avgTimePerSymbol).toBe(dto.processingTime / dto.symbolsCount);
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.processingTime = 75;
        dto.symbolsCount = 3;
        dto.isSlowMapping = false;
        dto.threshold = 1000;
        dto.avgTimePerSymbol = 25;

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Performance Analysis', () => {
      it('should calculate performance metrics correctly', () => {
        // Arrange
        const totalTime = 300;
        const symbolCount = 20;
        const threshold = 500;

        dto.processingTime = totalTime;
        dto.symbolsCount = symbolCount;
        dto.threshold = threshold;
        dto.avgTimePerSymbol = totalTime / symbolCount;
        dto.isSlowMapping = totalTime > threshold;

        // Assert
        expect(dto.avgTimePerSymbol).toBe(15);
        expect(dto.isSlowMapping).toBe(false);
      });

      it('should handle zero symbols gracefully', () => {
        // Arrange
        dto.processingTime = 100;
        dto.symbolsCount = 0;
        dto.threshold = 1000;
        dto.avgTimePerSymbol = 0;
        dto.isSlowMapping = false;

        // Assert
        expect(dto.symbolsCount).toBe(0);
        expect(dto.avgTimePerSymbol).toBe(0);
      });
    });
  });

  describe('SymbolMapperApplicationResultDto', () => {
    let dto: SymbolMapperApplicationResultDto;

    beforeEach(() => {
      dto = new SymbolMapperApplicationResultDto();
    });

    describe('Valid Data', () => {
      it('should create instance with application result', () => {
        // Arrange
        dto.transformedSymbols = {
          '00700.HK': '00700',
          'AAPL.US': 'AAPL',
          'GOOGL.US': 'GOOGL',
        };
        dto.mappedCount = 3;
        dto.unmappedCount = 0;
        dto.processingTime = 120;
        dto.dataSourceName = 'longport';
        dto.mappingInSymbolId = 'rule-mapping-789';

        // Assert
        expect(Object.keys(dto.transformedSymbols)).toHaveLength(3);
        expect(dto.mappedCount).toBe(3);
        expect(dto.unmappedCount).toBe(0);
        expect(dto.processingTime).toBe(120);
        expect(dto.dataSourceName).toBe('longport');
        expect(dto.mappingInSymbolId).toBe('rule-mapping-789');
      });

      it('should handle partial mapping results', () => {
        // Arrange
        dto.transformedSymbols = {
          '00700.HK': '00700',
          'INVALID.SYMBOL': 'INVALID.SYMBOL', // No mapping found
        };
        dto.mappedCount = 1;
        dto.unmappedCount = 1;
        dto.processingTime = 200;
        dto.dataSourceName = 'longport';

        // Assert
        expect(dto.mappedCount).toBe(1);
        expect(dto.unmappedCount).toBe(1);
        expect(dto.mappedCount + dto.unmappedCount).toBe(Object.keys(dto.transformedSymbols).length);
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.transformedSymbols = { 'TEST': 'TEST' };
        dto.mappedCount = 1;
        dto.unmappedCount = 0;
        dto.processingTime = 50;
        dto.dataSourceName = 'test_provider';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Mapping Statistics', () => {
      it('should calculate mapping statistics correctly', () => {
        // Arrange
        const totalSymbols = 10;
        const successfulMappings = 8;
        const failedMappings = 2;

        dto.transformedSymbols = {};
        // Simulate 10 symbols
        for (let i = 0; i < totalSymbols; i++) {
          dto.transformedSymbols[`SYMBOL${i}`] = i < successfulMappings ? `MAPPED${i}` : `SYMBOL${i}`;
        }
        dto.mappedCount = successfulMappings;
        dto.unmappedCount = failedMappings;
        dto.processingTime = 300;
        dto.dataSourceName = 'test_provider';

        // Assert
        expect(dto.mappedCount).toBe(8);
        expect(dto.unmappedCount).toBe(2);
        expect(dto.mappedCount + dto.unmappedCount).toBe(totalSymbols);
        expect(Object.keys(dto.transformedSymbols)).toHaveLength(totalSymbols);
      });
    });
  });

  describe('SymbolMapperTransformationLogDto', () => {
    let dto: SymbolMapperTransformationLogDto;

    beforeEach(() => {
      dto = new SymbolMapperTransformationLogDto();
    });

    describe('Valid Data', () => {
      it('should create successful transformation log', () => {
        // Arrange
        dto.originalSymbol = '00700.HK';
        dto.mappedSymbol = '00700';
        dto.fromProvider = 'standard';
        dto.toProvider = 'longport';
        dto.processingTime = 15;
        dto.success = true;
        dto.operation = 'transform';

        // Assert
        expect(dto.originalSymbol).toBe('00700.HK');
        expect(dto.mappedSymbol).toBe('00700');
        expect(dto.fromProvider).toBe('standard');
        expect(dto.toProvider).toBe('longport');
        expect(dto.processingTime).toBe(15);
        expect(dto.success).toBe(true);
        expect(dto.operation).toBe('transform');
      });

      it('should create failed transformation log', () => {
        // Arrange
        dto.originalSymbol = 'INVALID.SYMBOL';
        dto.mappedSymbol = 'INVALID.SYMBOL';
        dto.fromProvider = 'standard';
        dto.toProvider = 'longport';
        dto.processingTime = 50;
        dto.success = false;
        dto.operation = 'transform_failed';

        // Assert
        expect(dto.originalSymbol).toBe(dto.mappedSymbol); // No transformation occurred
        expect(dto.success).toBe(false);
        expect(dto.operation).toBe('transform_failed');
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.originalSymbol = 'AAPL.US';
        dto.mappedSymbol = 'AAPL';
        dto.fromProvider = 'standard';
        dto.toProvider = 'longport';
        dto.processingTime = 25;
        dto.success = true;
        dto.operation = 'transform';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Transformation Analysis', () => {
      it('should track transformation performance', () => {
        // Arrange
        dto.originalSymbol = 'MSFT.US';
        dto.mappedSymbol = 'MSFT';
        dto.fromProvider = 'standard';
        dto.toProvider = 'longport';
        dto.processingTime = 8;
        dto.success = true;
        dto.operation = 'fast_transform';

        // Assert
        expect(dto.processingTime).toBeLessThan(10);
        expect(dto.success).toBe(true);
      });
    });
  });

  describe('SymbolMapperDataSourceMappingLogDto', () => {
    let dto: SymbolMapperDataSourceMappingLogDto;

    beforeEach(() => {
      dto = new SymbolMapperDataSourceMappingLogDto();
    });

    describe('Valid Data', () => {
      it('should create successful data source mapping log', () => {
        // Arrange
        dto.dataSourceName = 'longport';
        dto.id = 'mapping-config-123';
        dto.rulesCount = 150;
        dto.operation = 'load_mapping_rules';
        dto.processingTime = 200;

        // Assert
        expect(dto.dataSourceName).toBe('longport');
        expect(dto.id).toBe('mapping-config-123');
        expect(dto.rulesCount).toBe(150);
        expect(dto.operation).toBe('load_mapping_rules');
        expect(dto.processingTime).toBe(200);
        expect(dto.error).toBeUndefined();
      });

      it('should create failed data source mapping log', () => {
        // Arrange
        dto.dataSourceName = 'failed_provider';
        dto.rulesCount = 0;
        dto.operation = 'load_mapping_rules_failed';
        dto.error = 'Connection timeout';

        // Assert
        expect(dto.dataSourceName).toBe('failed_provider');
        expect(dto.rulesCount).toBe(0);
        expect(dto.error).toBe('Connection timeout');
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.dataSourceName = 'longport_sg';
        dto.rulesCount = 75;
        dto.operation = 'validate_rules';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });
  });

  describe('SymbolMapperBatchTransformationLogDto', () => {
    let dto: SymbolMapperBatchTransformationLogDto;

    beforeEach(() => {
      dto = new SymbolMapperBatchTransformationLogDto();
    });

    describe('Valid Data', () => {
      it('should create successful batch transformation log', () => {
        // Arrange
        dto.dataSourceName = 'longport';
        dto.symbolsCount = 100;
        dto.mappedCount = 95;
        dto.processingTime = 500;
        dto.operation = 'batch_transform';
        dto.symbols = ['00700.HK', 'AAPL.US', 'GOOGL.US'];
        dto.mappingInSymbolId = 'batch-rule-456';

        // Assert
        expect(dto.dataSourceName).toBe('longport');
        expect(dto.symbolsCount).toBe(100);
        expect(dto.mappedCount).toBe(95);
        expect(dto.processingTime).toBe(500);
        expect(dto.operation).toBe('batch_transform');
        expect(dto.symbols).toHaveLength(3);
        expect(dto.mappingInSymbolId).toBe('batch-rule-456');
      });

      it('should calculate batch performance metrics', () => {
        // Arrange
        dto.dataSourceName = 'longport';
        dto.symbolsCount = 1000;
        dto.mappedCount = 950;
        dto.processingTime = 2000;
        dto.operation = 'large_batch_transform';

        // Act
        const successRate = dto.mappedCount / dto.symbolsCount;
        const avgTimePerSymbol = dto.processingTime / dto.symbolsCount;

        // Assert
        expect(successRate).toBe(0.95);
        expect(avgTimePerSymbol).toBe(2);
        expect(dto.mappedCount).toBeLessThan(dto.symbolsCount);
      });

      it('should validate successfully', async () => {
        // Arrange
        dto.dataSourceName = 'test_provider';
        dto.symbolsCount = 10;
        dto.mappedCount = 8;
        dto.processingTime = 100;
        dto.operation = 'test_batch';

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.length).toBe(0);
      });
    });

    describe('Batch Processing Analysis', () => {
      it('should handle large batch operations', () => {
        // Arrange
        dto.dataSourceName = 'longport';
        dto.symbolsCount = 10000;
        dto.mappedCount = 9800;
        dto.processingTime = 15000;
        dto.operation = 'massive_batch_transform';

        // Assert
        expect(dto.symbolsCount).toBe(10000);
        expect(dto.mappedCount / dto.symbolsCount).toBeGreaterThan(0.95);
        expect(dto.processingTime / dto.symbolsCount).toBeLessThan(2);
      });

      it('should handle empty batch operations', () => {
        // Arrange
        dto.dataSourceName = 'empty_provider';
        dto.symbolsCount = 0;
        dto.mappedCount = 0;
        dto.processingTime = 5;
        dto.operation = 'empty_batch';

        // Assert
        expect(dto.symbolsCount).toBe(0);
        expect(dto.mappedCount).toBe(0);
        expect(dto.processingTime).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-world Usage Scenarios', () => {
    describe('HK Stock Symbol Mapping', () => {
      it('should handle HK stock symbol transformation', () => {
        // Arrange
        const internalMapping = new InternalSymbolMappingDto();
        internalMapping.standardSymbol = '00700.HK';
        internalMapping.sdkSymbol = '00700';
        internalMapping.isActive = true;
        internalMapping.market = 'HK';
        internalMapping.symbolType = 'stock';
        internalMapping.note = 'Tencent Holdings Ltd - Remove .HK suffix for LongPort API';

        const transformationLog = new SymbolMapperTransformationLogDto();
        transformationLog.originalSymbol = '00700.HK';
        transformationLog.mappedSymbol = '00700';
        transformationLog.fromProvider = 'standard';
        transformationLog.toProvider = 'longport';
        transformationLog.processingTime = 12;
        transformationLog.success = true;
        transformationLog.operation = 'hk_suffix_removal';

        // Assert
        expect(internalMapping.standardSymbol).toBe('00700.HK');
        expect(internalMapping.sdkSymbol).toBe('00700');
        expect(internalMapping.market).toBe('HK');
        expect(transformationLog.success).toBe(true);
        expect(transformationLog.processingTime).toBeLessThan(20);
      });
    });

    describe('US Stock Symbol Mapping', () => {
      it('should handle US stock symbol transformation', () => {
        // Arrange
        const applicationResult = new SymbolMapperApplicationResultDto();
        applicationResult.transformedSymbols = {
          'AAPL.US': 'AAPL',
          'GOOGL.US': 'GOOGL',
          'MSFT.US': 'MSFT',
          'TSLA.US': 'TSLA',
        };
        applicationResult.mappedCount = 4;
        applicationResult.unmappedCount = 0;
        applicationResult.processingTime = 45;
        applicationResult.dataSourceName = 'longport';

        // Assert
        expect(applicationResult.mappedCount).toBe(4);
        expect(applicationResult.unmappedCount).toBe(0);
        expect(Object.keys(applicationResult.transformedSymbols)).toHaveLength(4);
        expect(applicationResult.processingTime).toBeLessThan(50);
      });
    });

    describe('Batch Processing Performance', () => {
      it('should handle high-performance batch processing', () => {
        // Arrange
        const batchLog = new SymbolMapperBatchTransformationLogDto();
        batchLog.dataSourceName = 'longport';
        batchLog.symbolsCount = 5000;
        batchLog.mappedCount = 4955;
        batchLog.processingTime = 8000;
        batchLog.operation = 'morning_batch_update';

        const performance = new SymbolMapperPerformanceDto();
        performance.processingTime = 8000;
        performance.symbolsCount = 5000;
        performance.threshold = 10000;
        performance.avgTimePerSymbol = 8000 / 5000;
        performance.isSlowMapping = 8000 > 10000;

        // Assert
        expect(batchLog.mappedCount / batchLog.symbolsCount).toBeGreaterThan(0.99);
        expect(performance.avgTimePerSymbol).toBe(1.6);
        expect(performance.isSlowMapping).toBe(false);
      });
    });

    describe('Error Handling and Monitoring', () => {
      it('should log mapping failures correctly', () => {
        // Arrange
        const dataSourceLog = new SymbolMapperDataSourceMappingLogDto();
        dataSourceLog.dataSourceName = 'problematic_provider';
        dataSourceLog.rulesCount = 0;
        dataSourceLog.operation = 'load_rules_failed';
        dataSourceLog.error = 'Database connection timeout after 30 seconds';

        const transformationLog = new SymbolMapperTransformationLogDto();
        transformationLog.originalSymbol = 'UNKNOWN.SYMBOL';
        transformationLog.mappedSymbol = 'UNKNOWN.SYMBOL';
        transformationLog.fromProvider = 'standard';
        transformationLog.toProvider = 'longport';
        transformationLog.processingTime = 100;
        transformationLog.success = false;
        transformationLog.operation = 'mapping_not_found';

        // Assert
        expect(dataSourceLog.error).toContain('timeout');
        expect(dataSourceLog.rulesCount).toBe(0);
        expect(transformationLog.success).toBe(false);
        expect(transformationLog.originalSymbol).toBe(transformationLog.mappedSymbol);
      });
    });
  });

  describe('Edge Cases and Performance', () => {
    describe('Large Scale Operations', () => {
      it('should handle very large symbol mappings', () => {
        // Arrange
        const largeApplicationResult = new SymbolMapperApplicationResultDto();
        largeApplicationResult.transformedSymbols = {};
        
        // Generate 10000 symbol mappings
        for (let i = 0; i < 10000; i++) {
          largeApplicationResult.transformedSymbols[`STOCK${i}.HK`] = `STOCK${i}`;
        }
        
        largeApplicationResult.mappedCount = 9950;
        largeApplicationResult.unmappedCount = 50;
        largeApplicationResult.processingTime = 25000;
        largeApplicationResult.dataSourceName = 'longport';

        // Assert
        expect(Object.keys(largeApplicationResult.transformedSymbols)).toHaveLength(10000);
        expect(largeApplicationResult.mappedCount).toBe(9950);
        expect(largeApplicationResult.unmappedCount).toBe(50);
        expect(largeApplicationResult.processingTime / 10000).toBe(2.5); // 2.5ms per symbol
      });
    });

    describe('Zero and Null Handling', () => {
      it('should handle zero processing times', () => {
        // Arrange
        const performance = new SymbolMapperPerformanceDto();
        performance.processingTime = 0;
        performance.symbolsCount = 1;
        performance.threshold = 1000;
        performance.avgTimePerSymbol = 0;
        performance.isSlowMapping = false;

        // Assert
        expect(performance.processingTime).toBe(0);
        expect(performance.avgTimePerSymbol).toBe(0);
        expect(performance.isSlowMapping).toBe(false);
      });

      it('should handle empty transformation results', () => {
        // Arrange
        const emptyResult = new SymbolMapperApplicationResultDto();
        emptyResult.transformedSymbols = {};
        emptyResult.mappedCount = 0;
        emptyResult.unmappedCount = 0;
        emptyResult.processingTime = 10;
        emptyResult.dataSourceName = 'empty_provider';

        // Assert
        expect(Object.keys(emptyResult.transformedSymbols)).toHaveLength(0);
        expect(emptyResult.mappedCount).toBe(0);
        expect(emptyResult.unmappedCount).toBe(0);
      });
    });
  });
});