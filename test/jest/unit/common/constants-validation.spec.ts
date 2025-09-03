/**
 * 常量验证工具单元测试
 * 测试常量重复检测和验证功能
 */

import { ConstantsValidator } from '../../../../src/common/utils/constants-validator.util';

describe('ConstantsValidator', () => {
  // 测试数据
  const mockConstantsWithDuplicates = {
    MODULE_A: {
      SUCCESS_MESSAGE: "操作成功",
      ERROR_MESSAGE: "操作失败",
      NOT_FOUND: "资源不存在",
    },
    MODULE_B: {
      SUCCESS_MESSAGE: "操作成功", // 重复
      CREATE_SUCCESS: "创建成功",
      NOT_FOUND: "资源不存在", // 重复
    },
    MODULE_C: {
      UPDATE_SUCCESS: "更新成功",
      ERROR_MESSAGE: "操作失败", // 重复
    }
  };

  const mockConstantsNoDuplicates = {
    MODULE_A: {
      SUCCESS_MESSAGE: "操作成功",
      ERROR_MESSAGE: "操作失败",
    },
    MODULE_B: {
      CREATE_SUCCESS: "创建成功",
      UPDATE_SUCCESS: "更新成功",
    }
  };

  const mockConstantsEmpty = {};

  describe('findDuplicateValues', () => {
    it('should find duplicate values correctly', () => {
      const duplicates = ConstantsValidator.findDuplicateValues(mockConstantsWithDuplicates);
      
      expect(duplicates).toHaveLength(3);
      
      // 检查重复项内容
      const duplicateValues = duplicates.map(d => d.value);
      expect(duplicateValues).toContain("操作成功");
      expect(duplicateValues).toContain("资源不存在");
      expect(duplicateValues).toContain("操作失败");
    });

    it('should return empty array when no duplicates exist', () => {
      const duplicates = ConstantsValidator.findDuplicateValues(mockConstantsNoDuplicates);
      
      expect(duplicates).toHaveLength(0);
    });

    it('should handle empty objects', () => {
      const duplicates = ConstantsValidator.findDuplicateValues(mockConstantsEmpty);
      
      expect(duplicates).toHaveLength(0);
    });

    it('should include correct paths for duplicates', () => {
      const duplicates = ConstantsValidator.findDuplicateValues(mockConstantsWithDuplicates);
      
      const successMessageDup = duplicates.find(d => d.value === "操作成功");
      expect(successMessageDup).toBeDefined();
      expect(successMessageDup!.keys).toContain("MODULE_A.SUCCESS_MESSAGE");
      expect(successMessageDup!.keys).toContain("MODULE_B.SUCCESS_MESSAGE");
      expect(successMessageDup!.count).toBe(2);
    });
  });

  describe('validateConstants', () => {
    it('should return invalid result for constants with duplicates', () => {
      const result = ConstantsValidator.validateConstants(mockConstantsWithDuplicates);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.duplicateDetails).toHaveLength(3);
    });

    it('should return valid result for constants without duplicates', () => {
      const result = ConstantsValidator.validateConstants(mockConstantsNoDuplicates);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.duplicateDetails).toHaveLength(0);
    });

    it('should provide correct statistics', () => {
      const result = ConstantsValidator.validateConstants(mockConstantsWithDuplicates);
      
      expect(result.statistics.totalConstants).toBe(7); // 总共7个字符串常量
      expect(result.statistics.duplicates).toBe(3); // 3组重复项
      expect(result.statistics.duplicationRate).toBeGreaterThan(0);
    });

    it('should handle edge cases', () => {
      const edgeCaseConstants = {
        EMPTY_STRING: "",
        LONG_MESSAGE: "这是一个非常长的消息".repeat(10), // 超过100字符
        WITH_NUMBERS: "错误代码123",
        WITH_NUMBERS_2: "状态码404",
      };
      
      const result = ConstantsValidator.validateConstants(edgeCaseConstants);
      
      // 应该有关于空字符串和长消息的警告
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('hasDuplicates', () => {
    it('should return true when duplicates exist', () => {
      const hasDuplicates = ConstantsValidator.hasDuplicates(mockConstantsWithDuplicates);
      
      expect(hasDuplicates).toBe(true);
    });

    it('should return false when no duplicates exist', () => {
      const hasDuplicates = ConstantsValidator.hasDuplicates(mockConstantsNoDuplicates);
      
      expect(hasDuplicates).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const stats = ConstantsValidator.getStatistics(mockConstantsWithDuplicates);
      
      expect(stats.totalConstants).toBe(7);
      expect(stats.stringConstants).toBe(7);
      expect(stats.duplicates).toBe(3);
      expect(stats.duplicationRate).toBeGreaterThan(0);
    });

    it('should handle empty constants', () => {
      const stats = ConstantsValidator.getStatistics(mockConstantsEmpty);
      
      expect(stats.totalConstants).toBe(0);
      expect(stats.stringConstants).toBe(0);
      expect(stats.duplicates).toBe(0);
      expect(stats.duplicationRate).toBe(0);
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', () => {
      const report = ConstantsValidator.generateReport(mockConstantsWithDuplicates);
      
      expect(typeof report).toBe('string');
      expect(report).toContain('常量验证报告');
      expect(report).toContain('统计信息');
      expect(report).toContain('重复项详情');
      expect(report).toContain('改进建议');
    });

    it('should show valid status for clean constants', () => {
      const report = ConstantsValidator.generateReport(mockConstantsNoDuplicates);
      
      expect(report).toContain('✅ 通过');
    });
  });

  describe('findPatternDuplicates', () => {
    it('should find duplicates matching specific patterns', () => {
      const errorPattern = /错误|失败/;
      const errorDuplicates = ConstantsValidator.findPatternDuplicates(
        mockConstantsWithDuplicates,
        errorPattern
      );
      
      expect(errorDuplicates.length).toBeGreaterThan(0);
      expect(errorDuplicates[0].value).toContain('失败');
    });

    it('should return empty array for non-matching patterns', () => {
      const nonExistentPattern = /不存在的模式/;
      const matches = ConstantsValidator.findPatternDuplicates(
        mockConstantsWithDuplicates,
        nonExistentPattern
      );
      
      expect(matches).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null and undefined values gracefully', () => {
      const constantsWithNulls = {
        VALID_MESSAGE: "有效消息",
        NULL_VALUE: null,
        UNDEFINED_VALUE: undefined,
        NESTED: {
          ANOTHER_MESSAGE: "另一个消息",
          ANOTHER_NULL: null,
        }
      };
      
      expect(() => {
        ConstantsValidator.findDuplicateValues(constantsWithNulls);
      }).not.toThrow();
      
      const duplicates = ConstantsValidator.findDuplicateValues(constantsWithNulls);
      expect(Array.isArray(duplicates)).toBe(true);
    });

    it('should handle circular references safely', () => {
      const circularObject: any = {
        MESSAGE: "测试消息"
      };
      circularObject.self = circularObject; // 创建循环引用
      
      expect(() => {
        ConstantsValidator.findDuplicateValues(circularObject);
      }).not.toThrow();
    });

    it('should handle functions and class instances', () => {
      const constantsWithFunctions = {
        MESSAGE: "正常消息",
        FUNCTION_VALUE: () => "函数返回值",
        CLASS_INSTANCE: new Date(),
        NESTED: {
          ANOTHER_MESSAGE: "嵌套消息",
          ANOTHER_FUNCTION: function() { return "test"; }
        }
      };
      
      expect(() => {
        const duplicates = ConstantsValidator.findDuplicateValues(constantsWithFunctions);
        expect(Array.isArray(duplicates)).toBe(true);
      }).not.toThrow();
    });
  });

  describe('performance tests', () => {
    it('should handle large datasets efficiently', () => {
      // 创建大型测试数据集
      const largeConstants: any = {};
      for (let i = 0; i < 1000; i++) {
        largeConstants[`MODULE_${i}`] = {
          MESSAGE_1: `消息${i}`,
          MESSAGE_2: i % 10 === 0 ? "重复消息" : `唯一消息${i}`, // 每10个有一个重复
          MESSAGE_3: `其他消息${i}`,
        };
      }
      
      const startTime = Date.now();
      const duplicates = ConstantsValidator.findDuplicateValues(largeConstants);
      const endTime = Date.now();
      
      // 验证性能 (应该在合理时间内完成)
      expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
      
      // 验证结果正确性
      expect(duplicates.length).toBeGreaterThan(0);
      const duplicateMessage = duplicates.find(d => d.value === "重复消息");
      expect(duplicateMessage).toBeDefined();
      expect(duplicateMessage!.count).toBe(100); // 应该有100个重复
    });
  });
});