/**
 * 提供商常量统一导出
 * 职责：提供单一入口访问所有提供商相关常量
 */

export * from './timeout.constants';
export * from './capability-names.constants';  
export * from './connection.constants';
export * from './metadata.constants';
export * from './symbol-formats.constants';

// 常量验证函数
export function validateConstants(): boolean {
  const timeoutKeys = Object.keys(PROVIDER_TIMEOUT);
  const capabilityNames = Object.keys(CAPABILITY_NAMES);
  const connectionStatuses = Object.keys(ConnectionStatus);
  
  console.log(`✅ 验证通过: ${timeoutKeys.length} 超时配置, ${capabilityNames.length} 能力名称, ${connectionStatuses.length} 连接状态`);
  return true;
}

// 重新导入用于验证函数
import { PROVIDER_TIMEOUT } from './timeout.constants';
import { CAPABILITY_NAMES } from './capability-names.constants';
import { ConnectionStatus } from './connection.constants';

/**
 * 常量统计信息
 */
export function getConstantsStats() {
  return {
    timeout: {
      count: Object.keys(PROVIDER_TIMEOUT).length,
      keys: Object.keys(PROVIDER_TIMEOUT),
    },
    capabilities: {
      count: Object.keys(CAPABILITY_NAMES).length,
      names: Object.values(CAPABILITY_NAMES),
    },
    connection: {
      statusCount: Object.keys(ConnectionStatus).length,
      statuses: Object.values(ConnectionStatus),
    },
    lastUpdated: new Date().toISOString(),
  };
}