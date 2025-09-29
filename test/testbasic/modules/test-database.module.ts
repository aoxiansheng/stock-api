import { Module } from '@nestjs/common';
import { createMongoConnectionMock } from '../mocks/mongodb.mock';

/**
 * 测试专用数据库模块
 * 提供MongoDB连接Mock，用于隔离数据库依赖
 */
@Module({
  providers: [
    // MongoDB连接Mock
    {
      provide: 'DatabaseConnection',
      useFactory: createMongoConnectionMock,
    },

    // Mongoose连接Mock
    {
      provide: 'MONGODB_CONNECTION',
      useFactory: createMongoConnectionMock,
    },
  ],
  exports: [
    'DatabaseConnection',
    'MONGODB_CONNECTION',
  ],
})
export class TestDatabaseModule {}