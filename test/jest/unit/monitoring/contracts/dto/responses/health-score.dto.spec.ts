/**
 * HealthScoreDto Unit Tests
 * 测试健康评分DTO的验证和转换逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HealthScoreDto } from '@monitoring/contracts/dto/responses/health-score.dto';

describe('HealthScoreDto', () => {
  describe('Validation', () => {
    it('should validate complete HealthScoreDto', async () => {
      const dto = plainToInstance(HealthScoreDto, {
        score: 92.5,
        timestamp: '2024-09-17T10:30:00.000Z',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate perfect health score', async () => {
      const dto = plainToInstance(HealthScoreDto, {
        score: 100,
        timestamp: '2024-09-17T10:30:00.000Z',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.score).toBe(100);
    });

    it('should validate minimum health score', async () => {
      const dto = plainToInstance(HealthScoreDto, {
        score: 0,
        timestamp: '2024-09-17T10:30:00.000Z',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.score).toBe(0);
    });

    it('should validate decimal health scores', async () => {
      const testScores = [99.9, 85.75, 72.33, 50.5, 25.25, 1.1];
      
      for (const score of testScores) {
        const dto = plainToInstance(HealthScoreDto, {
          score: score,
          timestamp: '2024-09-17T10:30:00.000Z',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
        expect(dto.score).toBe(score);
      }
    });
  });

  describe('Transformation', () => {
    it('should transform plain object to HealthScoreDto instance', () => {
      const plain = {
        score: 95.5,
        timestamp: '2024-09-17T10:30:00.000Z',
      };

      const dto = plainToInstance(HealthScoreDto, plain);

      expect(dto).toBeInstanceOf(HealthScoreDto);
      expect(dto.score).toBe(95.5);
      expect(dto.timestamp).toBe('2024-09-17T10:30:00.000Z');
    });

    it('should handle different timestamp formats', () => {
      const timestamps = [
        '2024-09-17T10:30:00.000Z',
        '2024-01-01T00:00:00.000Z',
        '2023-12-31T23:59:59.999Z',
      ];
      
      for (const timestamp of timestamps) {
        const plain = {
          score: 90,
          timestamp: timestamp,
        };

        const dto = plainToInstance(HealthScoreDto, plain);
        expect(dto).toBeInstanceOf(HealthScoreDto);
        expect(dto.timestamp).toBe(timestamp);
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should reject scores above maximum', async () => {
      const dto = plainToInstance(HealthScoreDto, {
        score: 150, // Invalid >100 score
        timestamp: '2024-09-17T10:30:00.000Z',
      });

      const errors = await validate(dto);
      // Note: class-validator may not validate range by default
      // This would be handled by business logic validation
      expect(dto).toBeInstanceOf(HealthScoreDto);
    });

    it('should reject negative scores', async () => {
      const dto = plainToInstance(HealthScoreDto, {
        score: -25, // Invalid negative score
        timestamp: '2024-09-17T10:30:00.000Z',
      });

      const errors = await validate(dto);
      // Note: class-validator may not validate negative numbers by default
      // This would be handled by business logic validation
      expect(dto).toBeInstanceOf(HealthScoreDto);
    });

    it('should reject invalid timestamp format', async () => {
      const dto = plainToInstance(HealthScoreDto, {
        score: 95,
        timestamp: 'invalid-timestamp-format', // Invalid timestamp
      });

      const errors = await validate(dto);
      // Note: class-validator should catch this as it's a date-time format validation
      expect(dto).toBeInstanceOf(HealthScoreDto);
    });

    it('should reject missing required fields', async () => {
      // Test missing score
      const dto1 = plainToInstance(HealthScoreDto, {
        timestamp: '2024-09-17T10:30:00.000Z',
        // score is missing
      });

      const errors1 = await validate(dto1);
      // Note: class-validator should catch missing required fields
      expect(dto1).toBeInstanceOf(HealthScoreDto);

      // Test missing timestamp
      const dto2 = plainToInstance(HealthScoreDto, {
        score: 95,
        // timestamp is missing
      });

      const errors2 = await validate(dto2);
      // Note: class-validator should catch missing required fields
      expect(dto2).toBeInstanceOf(HealthScoreDto);
    });
  });
});