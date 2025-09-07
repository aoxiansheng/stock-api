/**
 * 通用状态枚举定义
 * 🎯 统一所有模块的状态定义，消除重复和不一致问题
 * @version 1.0.0
 * @since 2025-09-05
 */

import { deepFreeze } from "../../common/utils/object-immutability.util";

/**
 * 通用状态枚举
 * @description 适用于用户、API Key、权限等模块的状态管理
 */
export const CommonStatus = deepFreeze({
  /** 激活状态 - 资源可正常使用 */
  ACTIVE: 'active',
  
  /** 非激活状态 - 资源暂时不可用 */
  INACTIVE: 'inactive',
  
  /** 待处理状态 - 等待验证或审核 */
  PENDING: 'pending',
  
  /** 暂停状态 - 临时停用但可恢复 */
  SUSPENDED: 'suspended',
  
  /** 删除状态 - 标记删除但未物理删除 */
  DELETED: 'deleted',
  
  /** 过期状态 - 超出有效期限 */
  EXPIRED: 'expired',
  
  /** 撤销状态 - 主动取消或撤回 */
  REVOKED: 'revoked',
  
  /** 锁定状态 - 由于安全或其他原因被锁定 */
  LOCKED: 'locked',
  
  /** 等待验证状态 - 需要邮箱或手机验证 */
  PENDING_VERIFICATION: 'pending_verification',
} as const);

/**
 * 通用状态类型
 */
export type CommonStatus = typeof CommonStatus[keyof typeof CommonStatus];

/**
 * 状态分组常量
 * @description 按功能对状态进行分组，便于业务逻辑判断
 */
export const StatusGroups = deepFreeze({
  /** 可用状态组 - 资源可正常访问和使用 */
  AVAILABLE: [CommonStatus.ACTIVE] as const,
  
  /** 不可用状态组 - 资源无法访问 */
  UNAVAILABLE: [
    CommonStatus.INACTIVE,
    CommonStatus.SUSPENDED,
    CommonStatus.DELETED,
    CommonStatus.EXPIRED,
    CommonStatus.REVOKED,
    CommonStatus.LOCKED
  ] as const,
  
  /** 临时状态组 - 可能变更的中间状态 */
  TEMPORARY: [
    CommonStatus.PENDING,
    CommonStatus.PENDING_VERIFICATION
  ] as const,
  
  /** 终态状态组 - 不可逆转的最终状态 */
  FINAL: [
    CommonStatus.DELETED,
    CommonStatus.REVOKED
  ] as const,
} as const);

/**
 * 简化的状态转换规则
 * @description 基于状态分组的简单转换逻辑
 */
export const StatusTransitionRules = deepFreeze({
  /** 临时状态可转为任何状态（除终态保护） */
  fromTemporary: (toStatus: CommonStatus): boolean => !StatusGroups.FINAL.includes(toStatus as any) || toStatus === CommonStatus.DELETED,
  
  /** 可用状态可转为任何状态 */
  fromAvailable: (): boolean => true,
  
  /** 不可用状态只能转为 ACTIVE 或 DELETED */
  fromUnavailable: (toStatus: CommonStatus): boolean => [CommonStatus.ACTIVE, CommonStatus.DELETED].includes(toStatus as any),
  
  /** 终态状态不能转换 */
  fromFinal: (): boolean => false,
} as const);

/**
 * 简化的状态工具函数
 */
export const StatusUtils = deepFreeze({
  /**
   * 检查状态是否可用
   */
  isAvailable: (status: CommonStatus): boolean => StatusGroups.AVAILABLE.includes(status as any),
  
  /**
   * 检查状态是否不可用
   */
  isUnavailable: (status: CommonStatus): boolean => StatusGroups.UNAVAILABLE.includes(status as any),
  
  /**
   * 检查状态是否为临时状态
   */
  isTemporary: (status: CommonStatus): boolean => StatusGroups.TEMPORARY.includes(status as any),
  
  /**
   * 检查状态是否为终态
   */
  isFinal: (status: CommonStatus): boolean => StatusGroups.FINAL.includes(status as any),
  
  /**
   * 验证状态转换是否合法 - 简化逻辑
   */
  canTransition: (fromStatus: CommonStatus, toStatus: CommonStatus): boolean => {
    // 不能转换到相同状态
    if (fromStatus === toStatus) return false;
    
    // 基于状态分组判断转换规则
    if (StatusUtils.isTemporary(fromStatus)) {
      return StatusTransitionRules.fromTemporary(toStatus);
    }
    if (StatusUtils.isAvailable(fromStatus)) {
      return StatusTransitionRules.fromAvailable();
    }
    if (StatusUtils.isUnavailable(fromStatus) && !StatusUtils.isFinal(fromStatus)) {
      return StatusTransitionRules.fromUnavailable(toStatus);
    }
    if (StatusUtils.isFinal(fromStatus)) {
      return StatusTransitionRules.fromFinal();
    }
    
    return false;
  },
  
  /**
   * 获取状态显示名称
   */
  getDisplayName: (status: CommonStatus): string => StatusDisplayNames[status] || status,
  
  /**
   * 获取状态描述
   */
  getDescription: (status: CommonStatus): string => StatusDescriptions[status] || `状态: ${status}`,
} as const);

/**
 * 状态显示名称映射
 * @description 用于UI显示的中文状态名称
 */
export const StatusDisplayNames = deepFreeze({
  [CommonStatus.ACTIVE]: '激活',
  [CommonStatus.INACTIVE]: '未激活',
  [CommonStatus.PENDING]: '等待处理',
  [CommonStatus.SUSPENDED]: '已暂停',
  [CommonStatus.DELETED]: '已删除',
  [CommonStatus.EXPIRED]: '已过期',
  [CommonStatus.REVOKED]: '已撤销',
  [CommonStatus.LOCKED]: '已锁定',
  [CommonStatus.PENDING_VERIFICATION]: '等待验证',
} as const);

/**
 * 状态描述信息映射
 * @description 详细的状态描述，用于日志和错误信息
 */
export const StatusDescriptions = deepFreeze({
  [CommonStatus.ACTIVE]: '资源处于激活状态，可正常使用',
  [CommonStatus.INACTIVE]: '资源处于非激活状态，暂时不可用',
  [CommonStatus.PENDING]: '资源等待处理中，请稍后再试',
  [CommonStatus.SUSPENDED]: '资源已被暂停，需要管理员处理',
  [CommonStatus.DELETED]: '资源已被删除，无法恢复',
  [CommonStatus.EXPIRED]: '资源已过期，需要重新申请或续期',
  [CommonStatus.REVOKED]: '资源已被撤销，无法恢复',
  [CommonStatus.LOCKED]: '资源已被锁定，请联系管理员',
  [CommonStatus.PENDING_VERIFICATION]: '资源等待验证，请检查邮箱或手机短信',
} as const);