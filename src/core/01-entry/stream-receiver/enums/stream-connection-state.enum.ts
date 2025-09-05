/**
 * Stream 连接状态枚举
 * 统一管理WebSocket连接的各种状态
 */
export enum StreamConnectionState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  CLOSED = 'closed'
}

/**
 * 连接状态转换映射
 */
export const CONNECTION_STATE_TRANSITIONS = {
  [StreamConnectionState.IDLE]: [StreamConnectionState.CONNECTING],
  [StreamConnectionState.CONNECTING]: [
    StreamConnectionState.CONNECTED, 
    StreamConnectionState.ERROR,
    StreamConnectionState.DISCONNECTED
  ],
  [StreamConnectionState.CONNECTED]: [
    StreamConnectionState.DISCONNECTED,
    StreamConnectionState.RECONNECTING,
    StreamConnectionState.ERROR
  ],
  [StreamConnectionState.RECONNECTING]: [
    StreamConnectionState.CONNECTED,
    StreamConnectionState.DISCONNECTED,
    StreamConnectionState.ERROR
  ],
  [StreamConnectionState.DISCONNECTED]: [
    StreamConnectionState.CONNECTING,
    StreamConnectionState.CLOSED
  ],
  [StreamConnectionState.ERROR]: [
    StreamConnectionState.RECONNECTING,
    StreamConnectionState.CLOSED
  ],
  [StreamConnectionState.CLOSED]: [StreamConnectionState.IDLE]
} as const;