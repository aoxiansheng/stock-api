/**
 * Simple test setup
 */

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGODB_URI = "mongodb://localhost:27017/test";
process.env.REDIS_URL = "redis://localhost:6379";

// Basic jest configuration
jest.setTimeout(30000);

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
