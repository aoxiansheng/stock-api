import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

import { DatabaseValidationUtils } from '@common/utils/database.utils';

describe('DatabaseValidationUtils', () => {
  describe('validateObjectId', () => {
    it('should pass validation for valid ObjectId', () => {
      const validId = new Types.ObjectId().toString();

      expect(() => {
        DatabaseValidationUtils.validateObjectId(validId);
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid ObjectId', () => {
      const invalidId = 'invalid-id';

      expect(() => {
        DatabaseValidationUtils.validateObjectId(invalidId);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException with custom field name', () => {
      const invalidId = 'invalid-id';
      const fieldName = '用户ID';

      expect(() => {
        DatabaseValidationUtils.validateObjectId(invalidId, fieldName);
      }).toThrow(new BadRequestException(
        `无效的${fieldName}格式: ${invalidId}`,
        'INVALID_OBJECT_ID'
      ));
    });

    it('should reject empty string', () => {
      expect(() => {
        DatabaseValidationUtils.validateObjectId('');
      }).toThrow(BadRequestException);
    });

    it('should reject null/undefined values', () => {
      expect(() => {
        DatabaseValidationUtils.validateObjectId(null as any);
      }).toThrow(BadRequestException);

      expect(() => {
        DatabaseValidationUtils.validateObjectId(undefined as any);
      }).toThrow(BadRequestException);
    });

    it('should reject short strings that look like ObjectId', () => {
      expect(() => {
        DatabaseValidationUtils.validateObjectId('123456');
      }).toThrow(BadRequestException);
    });

    it('should reject ObjectId-length strings with invalid characters', () => {
      expect(() => {
        DatabaseValidationUtils.validateObjectId('12345678901234567890123g'); // invalid char 'g'
      }).toThrow(BadRequestException);
    });
  });

  describe('validateObjectIds', () => {
    it('should pass validation for all valid ObjectIds', () => {
      const validIds = [
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ];

      expect(() => {
        DatabaseValidationUtils.validateObjectIds(validIds);
      }).not.toThrow();
    });

    it('should throw BadRequestException when any ObjectId is invalid', () => {
      const mixedIds = [
        new Types.ObjectId().toString(),
        'invalid-id',
        new Types.ObjectId().toString(),
      ];

      expect(() => {
        DatabaseValidationUtils.validateObjectIds(mixedIds);
      }).toThrow(BadRequestException);
    });

    it('should include all invalid IDs in error message', () => {
      const invalidIds = ['invalid-1', 'invalid-2'];
      const mixedIds = [
        new Types.ObjectId().toString(),
        ...invalidIds,
      ];

      expect(() => {
        DatabaseValidationUtils.validateObjectIds(mixedIds);
      }).toThrow(new BadRequestException(
        `ID列表中包含无效格式: ${invalidIds.join(', ')}`,
        'INVALID_OBJECT_ID_BATCH'
      ));
    });

    it('should handle empty array', () => {
      expect(() => {
        DatabaseValidationUtils.validateObjectIds([]);
      }).not.toThrow();
    });

    it('should throw with custom field name', () => {
      const fieldName = '产品ID列表';
      const invalidIds = ['invalid-id'];

      expect(() => {
        DatabaseValidationUtils.validateObjectIds(invalidIds, fieldName);
      }).toThrow(new BadRequestException(
        `${fieldName}中包含无效格式: invalid-id`,
        'INVALID_OBJECT_ID_BATCH'
      ));
    });
  });

  describe('isValidObjectId', () => {
    it('should return true for valid ObjectId', () => {
      const validId = new Types.ObjectId().toString();

      expect(DatabaseValidationUtils.isValidObjectId(validId)).toBe(true);
    });

    it('should return false for invalid ObjectId', () => {
      const invalidId = 'invalid-id';

      expect(DatabaseValidationUtils.isValidObjectId(invalidId)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(DatabaseValidationUtils.isValidObjectId('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(DatabaseValidationUtils.isValidObjectId(null as any)).toBe(false);
      expect(DatabaseValidationUtils.isValidObjectId(undefined as any)).toBe(false);
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        '123',
        '12345678901234567890123g', // invalid character
        '12345678901234567890123', // too short
        '123456789012345678901234', // correct length but all numbers
      ];

      edgeCases.forEach(testCase => {
        expect(DatabaseValidationUtils.isValidObjectId(testCase)).toBe(false);
      });
    });
  });

  describe('validateAndConvertToObjectId', () => {
    it('should convert valid string to ObjectId', () => {
      const validId = new Types.ObjectId().toString();

      const result = DatabaseValidationUtils.validateAndConvertToObjectId(validId);

      expect(result).toBeInstanceOf(Types.ObjectId);
      expect(result.toString()).toBe(validId);
    });

    it('should throw BadRequestException for invalid ObjectId', () => {
      const invalidId = 'invalid-id';

      expect(() => {
        DatabaseValidationUtils.validateAndConvertToObjectId(invalidId);
      }).toThrow(BadRequestException);
    });

    it('should throw with custom field name', () => {
      const invalidId = 'invalid-id';
      const fieldName = '订单ID';

      expect(() => {
        DatabaseValidationUtils.validateAndConvertToObjectId(invalidId, fieldName);
      }).toThrow(new BadRequestException(
        `无效的${fieldName}格式: ${invalidId}`,
        'INVALID_OBJECT_ID'
      ));
    });

    it('should preserve ObjectId equality', () => {
      const originalObjectId = new Types.ObjectId();
      const stringId = originalObjectId.toString();

      const convertedObjectId = DatabaseValidationUtils.validateAndConvertToObjectId(stringId);

      expect(convertedObjectId.equals(originalObjectId)).toBe(true);
    });
  });

  describe('validateAndConvertToObjectIds', () => {
    it('should convert valid strings to ObjectIds array', () => {
      const validIds = [
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ];

      const result = DatabaseValidationUtils.validateAndConvertToObjectIds(validIds);

      expect(result).toHaveLength(2);
      result.forEach(objectId => {
        expect(objectId).toBeInstanceOf(Types.ObjectId);
      });

      // Verify conversion accuracy
      expect(result[0].toString()).toBe(validIds[0]);
      expect(result[1].toString()).toBe(validIds[1]);
    });

    it('should throw BadRequestException when any ObjectId is invalid', () => {
      const mixedIds = [
        new Types.ObjectId().toString(),
        'invalid-id',
      ];

      expect(() => {
        DatabaseValidationUtils.validateAndConvertToObjectIds(mixedIds);
      }).toThrow(BadRequestException);
    });

    it('should handle empty array', () => {
      const result = DatabaseValidationUtils.validateAndConvertToObjectIds([]);

      expect(result).toEqual([]);
    });

    it('should throw with custom field name', () => {
      const invalidIds = ['invalid-id'];
      const fieldName = '权限ID列表';

      expect(() => {
        DatabaseValidationUtils.validateAndConvertToObjectIds(invalidIds, fieldName);
      }).toThrow(new BadRequestException(
        `${fieldName}中包含无效格式: invalid-id`,
        'INVALID_OBJECT_ID_BATCH'
      ));
    });

    it('should preserve ObjectId equality for all elements', () => {
      const originalObjectIds = [
        new Types.ObjectId(),
        new Types.ObjectId(),
        new Types.ObjectId(),
      ];
      const stringIds = originalObjectIds.map(id => id.toString());

      const convertedObjectIds = DatabaseValidationUtils.validateAndConvertToObjectIds(stringIds);

      convertedObjectIds.forEach((converted, index) => {
        expect(converted.equals(originalObjectIds[index])).toBe(true);
      });
    });
  });

  describe('error handling edge cases', () => {
    it('should handle very long invalid strings', () => {
      const veryLongInvalidId = 'a'.repeat(1000);

      expect(() => {
        DatabaseValidationUtils.validateObjectId(veryLongInvalidId);
      }).toThrow(BadRequestException);
    });

    it('should handle special characters', () => {
      const specialCharId = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      expect(() => {
        DatabaseValidationUtils.validateObjectId(specialCharId);
      }).toThrow(BadRequestException);
    });

    it('should handle whitespace strings', () => {
      const whitespaceId = '   ';

      expect(() => {
        DatabaseValidationUtils.validateObjectId(whitespaceId);
      }).toThrow(BadRequestException);
    });

    it('should handle ObjectId with leading/trailing spaces', () => {
      const validId = new Types.ObjectId().toString();
      const spacedId = `  ${validId}  `;

      expect(() => {
        DatabaseValidationUtils.validateObjectId(spacedId);
      }).toThrow(BadRequestException);
    });
  });
});
