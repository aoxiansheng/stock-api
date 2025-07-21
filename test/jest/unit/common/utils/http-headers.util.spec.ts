import { HttpHeadersUtil } from '../../../../../src/common/utils/http-headers.util';

describe('HttpHeadersUtil', () => {
  describe('validateApiCredentials', () => {
    it('应该成功验证有效的API凭证', () => {
      // Arrange
      const mockRequest = {
        headers: {
          'x-app-key': 'valid-app-key',
          'x-access-token': 'valid-access-token',
        },
      } as any;

      // Act
      const result = HttpHeadersUtil.validateApiCredentials(mockRequest);

      // Assert
      expect(result).toEqual({
        appKey: 'valid-app-key',
        accessToken: 'valid-access-token',
      });
    });

    it('应该在缺少API凭证时抛出错误', () => {
      // Arrange
      const mockRequest = {
        headers: {
          'x-access-token': 'valid-access-token',
        },
      } as any;

      // Act & Assert
      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest))
        .toThrow('缺少API凭证');
    });

    it('应该拒绝包含空格的API凭证', () => {
      // Arrange
      const mockRequest = {
        headers: {
          'x-app-key': 'invalid app key',
          'x-access-token': 'valid-access-token',
        },
      } as any;

      // Act & Assert
      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest))
        .toThrow('API凭证格式无效：App Key包含空格或无效字符');
    });

    it('应该拒绝包含制表符的API凭证', () => {
      // Arrange
      const mockRequest = {
        headers: {
          'x-app-key': 'valid-app-key',
          'x-access-token': 'invalid\taccess\ttoken',
        },
      } as any;

      // Act & Assert
      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest))
        .toThrow('API凭证格式无效：Access Token包含空格或无效字符');
    });

    it('应该拒绝包含换行符的API凭证', () => {
      // Arrange
      const mockRequest = {
        headers: {
          'x-app-key': 'invalid\napp\nkey',
          'x-access-token': 'valid-access-token',
        },
      } as any;

      // Act & Assert
      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest))
        .toThrow('API凭证格式无效：App Key包含空格或无效字符');
    });

    it('应该处理大小写不同的header名称', () => {
      // Arrange
      const mockRequest = {
        headers: {
          'X-App-Key': 'valid-app-key',
          'X-Access-Token': 'valid-access-token',
        },
      } as any;

      // Act
      const result = HttpHeadersUtil.validateApiCredentials(mockRequest);

      // Assert
      expect(result).toEqual({
        appKey: 'valid-app-key',
        accessToken: 'valid-access-token',
      });
    });
  });
}); 