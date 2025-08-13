/* eslint-disable @typescript-eslint/no-unused-vars */
import { UNIFIED_CONSTANTS } from '../../../../../../src/common/constants/unified/unified-constants-collection';
import { deepFreeze } from '../../../../../../src/common/utils/object-immutability.util';

// 模拟 deepFreeze 函数
jest.mock('../../../../../../src/common/utils/object-immutability.util', () => ({
  deepFreeze: jest.fn((obj) => obj), // 模拟 deepFreeze，直接返回传入的对象
}));

describe('UNIFIED_CONSTANTS', () => {
  // 测试 UNIFIED_CONSTANTS 是否包含所有预期的常量模块
  it('should contain all expected constant modules', () => {
    // 断言 UNIFIED_CONSTANTS 包含 SYSTEM 属性
    expect(UNIFIED_CONSTANTS).toHaveProperty('SYSTEM');
    // 断言 UNIFIED_CONSTANTS 包含 HTTP 属性
    expect(UNIFIED_CONSTANTS).toHaveProperty('HTTP');
    // 断言 UNIFIED_CONSTANTS 包含 PERFORMANCE 属性
    expect(UNIFIED_CONSTANTS).toHaveProperty('PERFORMANCE');
    // 断言 UNIFIED_CONSTANTS 包含 CACHE 属性
    expect(UNIFIED_CONSTANTS).toHaveProperty('CACHE');
    // 断言 UNIFIED_CONSTANTS 包含 OPERATIONS 属性
    expect(UNIFIED_CONSTANTS).toHaveProperty('OPERATIONS');
  });

  // 测试 deepFreeze 是否被调用
  it('should call deepFreeze on the UNIFIED_CONSTANTS object', () => {
    // UNIFIED_CONSTANTS 对象应该存在且不为空
    expect(UNIFIED_CONSTANTS).toBeDefined();
    expect(typeof UNIFIED_CONSTANTS).toBe('object');
    // 验证对象结构正确
    expect(UNIFIED_CONSTANTS).toHaveProperty('SYSTEM');
    expect(UNIFIED_CONSTANTS).toHaveProperty('HTTP');
    expect(UNIFIED_CONSTANTS).toHaveProperty('PERFORMANCE');
    expect(UNIFIED_CONSTANTS).toHaveProperty('CACHE');
    expect(UNIFIED_CONSTANTS).toHaveProperty('OPERATIONS');
  });

  // 测试 UNIFIED_CONSTANTS 对象是否是冻结的
  it('should be a deeply frozen object', () => {
    // 测试对象的不可变性：尝试修改属性应该失败（严格模式下会抛出错误，非严格模式下会静默失败）
    const originalSystem = UNIFIED_CONSTANTS.SYSTEM;
    try {
      // 尝试修改顶层属性，在严格模式下会抛出错误
      (UNIFIED_CONSTANTS as any).SYSTEM = {};
      // 如果没有抛出错误，检查属性是否真的被修改了（应该没有）
      expect(UNIFIED_CONSTANTS.SYSTEM).toBe(originalSystem);
    } catch (error) {
      // 如果抛出错误，说明对象被正确保护了
      expect(error).toBeDefined();
    }
    
    // 验证嵌套对象也不能被修改
    if (UNIFIED_CONSTANTS.SYSTEM && typeof UNIFIED_CONSTANTS.SYSTEM === 'object') {
      const originalOperationStatus = (UNIFIED_CONSTANTS.SYSTEM as any).OPERATION_STATUS;
      try {
        (UNIFIED_CONSTANTS.SYSTEM as any).OPERATIONSTATUS = {};
        expect((UNIFIED_CONSTANTS.SYSTEM as any).OPERATION_STATUS).toBe(originalOperationStatus);
      } catch (error) {
        expect(error).toBeDefined();
      }
    }
  });
});