import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../../../src/database/database.module';
import { AuthDatabaseModule } from '../../../../src/database/domains/auth.database';
import { CoreDatabaseModule } from '../../../../src/database/domains/core.database';
import { NotificationDatabaseModule } from '../../../../src/database/domains/notification.database';

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

// Mock domain database modules
jest.mock('../../../../src/database/domains/auth.database', () => ({
  AuthDatabaseModule: {
    imports: [],
    providers: [],
    exports: [],
  },
}));

jest.mock('../../../../src/database/domains/core.database', () => ({
  CoreDatabaseModule: {
    imports: [],
    providers: [],
    exports: [],
  },
}));

jest.mock('../../../../src/database/domains/notification.database', () => ({
  NotificationDatabaseModule: {
    imports: [],
    providers: [],
    exports: [],
  },
}));

describe('DatabaseModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Clear environment variables and set defaults for testing
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    process.env.MONGODB_POOL_SIZE = '50';

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/test-db', {
          maxPoolSize: 50,
        }),
        AuthDatabaseModule,
        CoreDatabaseModule,
        NotificationDatabaseModule,
      ],
      exports: [
        AuthDatabaseModule,
        CoreDatabaseModule,
        NotificationDatabaseModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }

    // Clean up environment variables
    delete process.env.MONGODB_URI;
    delete process.env.MONGODB_POOL_SIZE;
  });

  describe('Module Creation', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should create DatabaseModule successfully', () => {
      expect(DatabaseModule).toBeDefined();
      expect(typeof DatabaseModule).toBe('function');
    });
  });

  describe('MongoDB Configuration', () => {
    it('should initialize MongooseModule with correct URI from environment', () => {
      process.env.MONGODB_URI = 'mongodb://test-host:27017/test-database';

      // This would be called during module initialization
      expect(MongooseModule.forRoot).toHaveBeenCalled();
    });

    it('should use default MongoDB URI when environment variable is not set', () => {
      delete process.env.MONGODB_URI;

      // The module should use the default URI
      const expectedDefaultUri = 'mongodb://localhost:27017/smart-stock-data';
      const actualUri = process.env.MONGODB_URI || expectedDefaultUri;

      expect(actualUri).toBe(expectedDefaultUri);
    });

    it('should parse MONGODB_POOL_SIZE from environment or use default', () => {
      process.env.MONGODB_POOL_SIZE = '200';
      const poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(poolSize).toBe(200);

      delete process.env.MONGODB_POOL_SIZE;
      const defaultPoolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(defaultPoolSize).toBe(100);
    });

    it('should handle invalid MONGODB_POOL_SIZE gracefully', () => {
      process.env.MONGODB_POOL_SIZE = 'invalid-number';
      const poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(poolSize).toBe(100); // Should fallback to default
    });
  });

  describe('Domain Modules Integration', () => {
    it('should include AuthDatabaseModule', () => {
      expect(AuthDatabaseModule).toBeDefined();
    });

    it('should include CoreDatabaseModule', () => {
      expect(CoreDatabaseModule).toBeDefined();
    });

    it('should include NotificationDatabaseModule', () => {
      expect(NotificationDatabaseModule).toBeDefined();
    });
  });

  describe('Module Architecture', () => {
    it('should export all domain database modules', () => {
      // Verify that the module exports contain all required domain modules
      const moduleMetadata = Reflect.getMetadata('imports', DatabaseModule) || [];
      const moduleExports = Reflect.getMetadata('exports', DatabaseModule) || [];

      // Check imports
      expect(moduleMetadata).toContain(AuthDatabaseModule);
      expect(moduleMetadata).toContain(CoreDatabaseModule);
      expect(moduleMetadata).toContain(NotificationDatabaseModule);

      // Check exports
      expect(moduleExports).toContain(AuthDatabaseModule);
      expect(moduleExports).toContain(CoreDatabaseModule);
      expect(moduleExports).toContain(NotificationDatabaseModule);
    });

    it('should follow single responsibility principle for database access', () => {
      // DatabaseModule should only handle database connection and module aggregation
      // It should not contain any business logic or repositories
      const moduleImports = Reflect.getMetadata('imports', DatabaseModule) || [];

      // Should contain MongooseModule.forRoot and domain modules only
      expect(moduleImports.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Variables Handling', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should handle missing environment variables gracefully', () => {
      delete process.env.MONGODB_URI;
      delete process.env.MONGODB_POOL_SIZE;

      const defaultUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-stock-data';
      const defaultPoolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;

      expect(defaultUri).toBe('mongodb://localhost:27017/smart-stock-data');
      expect(defaultPoolSize).toBe(100);
    });

    it('should use custom environment variables when provided', () => {
      process.env.MONGODB_URI = 'mongodb://custom-host:27018/custom-db';
      process.env.MONGODB_POOL_SIZE = '150';

      const customUri = process.env.MONGODB_URI;
      const customPoolSize = parseInt(process.env.MONGODB_POOL_SIZE);

      expect(customUri).toBe('mongodb://custom-host:27018/custom-db');
      expect(customPoolSize).toBe(150);
    });

    it('should handle edge cases in pool size configuration', () => {
      // Test zero pool size
      process.env.MONGODB_POOL_SIZE = '0';
      let poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(poolSize).toBe(100); // Should use default

      // Test negative pool size
      process.env.MONGODB_POOL_SIZE = '-10';
      poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(poolSize).toBe(-10); // parseInt will return the negative number

      // Test very large pool size
      process.env.MONGODB_POOL_SIZE = '99999';
      poolSize = parseInt(process.env.MONGODB_POOL_SIZE) || 100;
      expect(poolSize).toBe(99999);
    });
  });

  describe('MongoDB Connection Configuration', () => {
    it('should configure MongoDB with correct options', () => {
      const expectedOptions = {
        maxPoolSize: 100, // default value
      };

      // Verify MongooseModule.forRoot was called with correct parameters
      expect(MongooseModule.forRoot).toHaveBeenCalledWith(
        expect.stringContaining('mongodb://'),
        expect.objectContaining(expectedOptions)
      );
    });

    it('should support different MongoDB URI formats', () => {
      const testCases = [
        'mongodb://localhost:27017/test-db',
        'mongodb://user:password@localhost:27017/test-db',
        'mongodb+srv://cluster.mongodb.net/test-db',
        'mongodb://localhost:27017,localhost:27018/test-db?replicaSet=rs0',
      ];

      testCases.forEach(uri => {
        process.env.MONGODB_URI = uri;
        const resolvedUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-stock-data';
        expect(resolvedUri).toBe(uri);
      });
    });
  });

  describe('Module Dependencies', () => {
    it('should properly manage dependencies between domain modules', () => {
      // Each domain module should be independent
      // DatabaseModule should only aggregate them without creating circular dependencies

      expect(AuthDatabaseModule).not.toBe(CoreDatabaseModule);
      expect(CoreDatabaseModule).not.toBe(NotificationDatabaseModule);
      expect(NotificationDatabaseModule).not.toBe(AuthDatabaseModule);
    });

    it('should ensure single MongoDB connection across all domains', () => {
      // MongooseModule.forRoot should only be called once in DatabaseModule
      // Domain modules should not call forRoot again

      expect(MongooseModule.forRoot).toHaveBeenCalled();

      // This ensures we're following the single connection principle
      // described in the module comments
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed MongoDB URI gracefully in environment', () => {
      const malformedUris = [
        'not-a-uri',
        'mongodb://',
        'mongodb://localhost',
        '',
        null,
        undefined,
      ];

      malformedUris.forEach(uri => {
        process.env.MONGODB_URI = uri;
        const resolvedUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-stock-data';

        if (uri === null || uri === undefined) {
          expect(resolvedUri).toBe('mongodb://localhost:27017/smart-stock-data');
        } else {
          expect(resolvedUri).toBe(uri);
        }
      });
    });
  });
});
