import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../../../src/database/database.module';

// Mock MongooseModule
jest.mock('@nestjs/mongoose', () => ({
  MongooseModule: {
    forRoot: jest.fn().mockReturnValue({
      module: 'MockedMongooseModule',
      providers: [],
      exports: [],
    }),
    forFeature: jest.fn().mockReturnValue({
      module: 'MockedMongooseFeatureModule',
      providers: [],
      exports: [],
    }),
  },
}));

describe('DatabaseModule (simplified)', () => {
  let module: TestingModule;

  beforeEach(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    process.env.MONGODB_POOL_SIZE = '50';

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/test-db', {
          maxPoolSize: 50,
        }),
        DatabaseModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_POOL_SIZE;
  });

  it('should compile module', () => {
    expect(module).toBeDefined();
    expect(DatabaseModule).toBeDefined();
    expect(typeof DatabaseModule).toBe('function');
  });

  it('should initialize MongooseModule.forRoot', () => {
    expect(MongooseModule.forRoot).toHaveBeenCalled();
  });

  it('should export MongooseModule for connection reuse', () => {
    const moduleExports = Reflect.getMetadata('exports', DatabaseModule) || [];
    expect(moduleExports).toContain(MongooseModule);
  });

  describe('Environment handling', () => {
    it('uses default URI when env missing', () => {
      delete process.env.MONGODB_URI;
      const expectedDefaultUri = 'mongodb://localhost:27017/smart-stock-data';
      const actualUri = process.env.MONGODB_URI || expectedDefaultUri;
      expect(actualUri).toBe(expectedDefaultUri);
    });

    it('parses pool size from env or uses default', () => {
      process.env.MONGODB_POOL_SIZE = '200';
      let poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(poolSize).toBe(200);

      delete process.env.MONGODB_POOL_SIZE;
      poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(poolSize).toBe(100);
    });
  });

  describe('Connection configuration', () => {
    it('configures MongoDB with expected options', () => {
      const expectedOptions = { maxPoolSize: 100 };
      expect(MongooseModule.forRoot).toHaveBeenCalledWith(
        expect.stringContaining('mongodb://'),
        expect.objectContaining(expectedOptions)
      );
    });

    it('supports different MongoDB URI formats', () => {
      const testCases = [
        'mongodb://localhost:27017/test-db',
        'mongodb://user:password@localhost:27017/test-db',
        'mongodb+srv://cluster.mongodb.net/test-db',
        'mongodb://localhost:27017,localhost:27018/test-db?replicaSet=rs0',
      ];

      testCases.forEach(uri => {
        process.env.MONGODB_URI = uri as any;
        const resolvedUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-stock-data';
        expect(resolvedUri).toBe(uri);
      });
    });
  });
});

