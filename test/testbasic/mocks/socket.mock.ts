import { Socket } from 'socket.io';

/**
 * Socket.IO Socket对象的模拟工厂
 * 提供完整的Socket模拟，确保结构与Socket.IO的Socket接口兼容
 * 
 * @param options 自定义选项
 * @returns 模拟的Socket对象
 */
export const socketMockFactory = (options: {
  id?: string;
  handshake?: {
    headers?: Record<string, any>;
    address?: string;
  } | null;  // 支持显式设置为null以测试异常情况
  user?: any;
  problemType?: 'nullHandshake' | 'nullHeaders' | 'nullId' | 'completelyBroken'; // 模拟特定问题类型
} = {}): Socket => {
  // 处理不同类型的问题场景
  if (options.problemType === 'completelyBroken') {
    // 返回一个非常不完整的对象，用于测试异常情况的健壮性
    return {
      id: null
      // 故意不包含handshake等属性
    } as unknown as Socket;
  }

  if (options.problemType === 'nullHandshake') {
    return {
      id: options.id || 'problem-socket',
      handshake: null,
      user: options.user || null
    } as unknown as Socket;
  }

  if (options.problemType === 'nullHeaders') {
    return {
      id: options.id || 'problem-socket',
      handshake: {
        headers: null,
        address: options.handshake?.address || '192.168.1.100'
      },
      user: options.user || null
    } as unknown as Socket;
  }

  if (options.problemType === 'nullId') {
    return {
      id: null,
      handshake: {
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '192.168.1.100',
          'x-real-ip': '192.168.1.100',
          ...(options.handshake?.headers || {})
        },
        address: options.handshake?.address || '192.168.1.100'
      },
      user: options.user || null
    } as unknown as Socket;
  }
  
  // 对于正常情况
  // 默认handshake结构
  const defaultHandshake = {
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.100',
      'x-real-ip': '192.168.1.100'
    },
    address: '192.168.1.100'
  };

  // 如果handshake被显式设置为null，则保持为null
  const finalHandshake = options.handshake === null ? null : {
    ...defaultHandshake,
    ...(options.handshake || {}),
    // 深度合并headers，确保嵌套属性不丢失
    headers: {
      ...defaultHandshake.headers,
      ...(options.handshake?.headers || {})
    }
  };

  // 构建完整Socket mock
  const socket = {
    id: options.id || 'socket-test-123',
    handshake: finalHandshake,
    user: options.user || null,
    
    // Socket.IO方法
    on: jest.fn(),
    emit: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    
    // 辅助测试的方法
    _reset: () => {
      Object.values(socket)
        .filter(value => typeof value === 'function' && 'mockReset' in value)
        .forEach((mockFn: any) => mockFn.mockReset());
    }
  } as unknown as Socket;

  return socket;
}; 