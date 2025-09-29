/**
 * 标准化MongoDB Mock - 提供Mongoose模型模拟
 * 用于单元测试中隔离MongoDB依赖
 */

import { Types } from 'mongoose';

export const createMongoModelMock = (mockData: any[] = []) => {
  const data = [...mockData];

  return {
    // 查询方法
    find: jest.fn().mockImplementation((query = {}) => ({
      exec: jest.fn().mockResolvedValue(data.filter(item =>
        Object.keys(query).every(key => item[key] === query[key])
      )),
      lean: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),

    findOne: jest.fn().mockImplementation((query = {}) => ({
      exec: jest.fn().mockResolvedValue(
        data.find(item =>
          Object.keys(query).every(key => item[key] === query[key])
        ) || null
      ),
      lean: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    })),

    findById: jest.fn().mockImplementation((id: string) => ({
      exec: jest.fn().mockResolvedValue(
        data.find(item => item._id?.toString() === id || item.id === id) || null
      ),
      lean: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    })),

    // 创建方法
    create: jest.fn().mockImplementation((doc: any) => {
      const newDoc = {
        _id: new Types.ObjectId(),
        ...doc,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      data.push(newDoc);
      return Promise.resolve(newDoc);
    }),

    // 更新方法
    findByIdAndUpdate: jest.fn().mockImplementation((id: string, update: any, options: any = {}) => {
      const index = data.findIndex(item => item._id?.toString() === id || item.id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...update, updatedAt: new Date() };
        return {
          exec: jest.fn().mockResolvedValue(options.new ? data[index] : data[index]),
          lean: jest.fn().mockReturnThis(),
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockReturnThis(),
      };
    }),

    findOneAndUpdate: jest.fn().mockImplementation((query: any, update: any, options: any = {}) => {
      const index = data.findIndex(item =>
        Object.keys(query).every(key => item[key] === query[key])
      );
      if (index !== -1) {
        data[index] = { ...data[index], ...update, updatedAt: new Date() };
        return {
          exec: jest.fn().mockResolvedValue(options.new ? data[index] : data[index]),
          lean: jest.fn().mockReturnThis(),
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockReturnThis(),
      };
    }),

    updateOne: jest.fn().mockImplementation((query: any, update: any) => ({
      exec: jest.fn().mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      }),
    })),

    updateMany: jest.fn().mockImplementation((query: any, update: any) => ({
      exec: jest.fn().mockResolvedValue({
        matchedCount: data.length,
        modifiedCount: data.length,
        acknowledged: true,
      }),
    })),

    // 删除方法
    findByIdAndDelete: jest.fn().mockImplementation((id: string) => {
      const index = data.findIndex(item => item._id?.toString() === id || item.id === id);
      if (index !== -1) {
        const deletedDoc = data.splice(index, 1)[0];
        return {
          exec: jest.fn().mockResolvedValue(deletedDoc),
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(null),
      };
    }),

    findOneAndDelete: jest.fn().mockImplementation((query: any) => {
      const index = data.findIndex(item =>
        Object.keys(query).every(key => item[key] === query[key])
      );
      if (index !== -1) {
        const deletedDoc = data.splice(index, 1)[0];
        return {
          exec: jest.fn().mockResolvedValue(deletedDoc),
        };
      }
      return {
        exec: jest.fn().mockResolvedValue(null),
      };
    }),

    deleteOne: jest.fn().mockImplementation((query: any) => ({
      exec: jest.fn().mockResolvedValue({
        deletedCount: 1,
        acknowledged: true,
      }),
    })),

    deleteMany: jest.fn().mockImplementation((query: any) => ({
      exec: jest.fn().mockResolvedValue({
        deletedCount: data.length,
        acknowledged: true,
      }),
    })),

    // 聚合方法
    aggregate: jest.fn().mockImplementation((pipeline: any[]) => ({
      exec: jest.fn().mockResolvedValue([]),
    })),

    // 计数方法
    countDocuments: jest.fn().mockImplementation((query = {}) => ({
      exec: jest.fn().mockResolvedValue(data.length),
    })),

    estimatedDocumentCount: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(data.length),
    })),

    // 事务支持
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
    }),

    // 索引方法
    createIndex: jest.fn().mockResolvedValue('index_name'),
    createIndexes: jest.fn().mockResolvedValue(['index1', 'index2']),
    dropIndex: jest.fn().mockResolvedValue({}),
    dropIndexes: jest.fn().mockResolvedValue({}),
    listIndexes: jest.fn().mockResolvedValue([]),

    // 验证方法
    validate: jest.fn().mockResolvedValue({}),

    // 内部状态访问（仅用于测试）
    _getMockData: () => data,
    _clearMockData: () => data.splice(0, data.length),
    _addMockData: (newData: any) => data.push(newData),
    _setMockData: (newData: any[]) => {
      data.splice(0, data.length, ...newData);
    },
  };
};

/**
 * 创建Mongoose连接Mock
 */
export const createMongoConnectionMock = () => ({
  readyState: 1, // 1 = connected
  host: 'localhost',
  port: 27017,
  name: 'test-database',

  // 连接方法
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),

  // 数据库方法
  db: jest.fn().mockReturnValue({
    admin: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue({}),
    }),
    collection: jest.fn().mockReturnValue(createMongoModelMock()),
  }),

  // 事件方法
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),

  // 模型注册
  model: jest.fn().mockImplementation((name: string) => createMongoModelMock()),
  models: {},
});

/**
 * 创建总是失败的MongoDB Mock
 */
export const createFailingMongoMock = () => {
  const error = new Error('MongoDB operation failed');

  return {
    find: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockRejectedValue(error),
      lean: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    })),
    findOne: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockRejectedValue(error),
    })),
    findById: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockRejectedValue(error),
    })),
    create: jest.fn().mockRejectedValue(error),
    save: jest.fn().mockRejectedValue(error),
    updateOne: jest.fn().mockRejectedValue(error),
    deleteOne: jest.fn().mockRejectedValue(error),
  };
};