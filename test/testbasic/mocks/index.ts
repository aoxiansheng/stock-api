/**
 * Mock导出汇总文件
 * 提供统一的Mock导入接口
 */

// Redis相关Mock
export {
  redisMockFactory,
  createRedisMockWithData,
  createFailingRedisMock,
  createSlowRedisMock,
} from './redis.mock';

// EventEmitter相关Mock
export {
  eventEmitterMockFactory,
  createSimpleEventEmitterMock,
  createFailingEventEmitterMock,
} from './event-emitter.mock';

// MongoDB相关Mock
export {
  createMongoModelMock,
  createMongoConnectionMock,
  createFailingMongoMock,
} from './mongodb.mock';