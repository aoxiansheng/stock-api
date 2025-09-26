import { AuthenticatedRequest } from '@auth/interfaces/authenticated-request.interface';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('Authenticated Request Interface', () => {
  it('应该正确定义认证请求接口', () => {
    // Arrange
    const mockApiKeyDocument = {
      id: 'apikey123',
      appKey: 'app-key',
      accessToken: 'access-token',
      name: 'Test API Key',
      permissions: [Permission.DATA_READ],
      rateLimit: { requestLimit: 100, window: '1h' },
      status: OperationStatus.ACTIVE,
      totalRequestCount: 0,
    } as any;

    const request = {
      user: mockApiKeyDocument,
      apiKey: mockApiKeyDocument,
    } as AuthenticatedRequest;

    // Assert
    expect(request).toBeDefined();
    expect(request.user).toBeDefined();
    expect(request.apiKey).toBeDefined();
    expect(request.user).toBe(request.apiKey);
  });

  it('应该允许user和apiKey属性为undefined', () => {
    // Arrange
    const request = {} as AuthenticatedRequest;

    // Assert
    expect(request).toBeDefined();
    expect(request.user).toBeUndefined();
    expect(request.apiKey).toBeUndefined();
  });
});