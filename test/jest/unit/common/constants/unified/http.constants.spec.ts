import {
  HTTP_CONSTANTS,
  isSuccessStatusCode,
  isClientErrorStatusCode,
  isServerErrorStatusCode,
  getErrorTypeByStatusCode,
} from '@common/constants/unified/http.constants';

describe('HTTP_CONSTANTS', () => {
  describe('STATUS_CODES', () => {
    it('should have all required success status codes (2xx)', () => {
      expect(HTTP_CONSTANTS.STATUS_CODES.OK).toBe(200);
      expect(HTTP_CONSTANTS.STATUS_CODES.CREATED).toBe(201);
      expect(HTTP_CONSTANTS.STATUS_CODES.ACCEPTED).toBe(202);
      expect(HTTP_CONSTANTS.STATUS_CODES.NO_CONTENT).toBe(204);
    });

    it('should have all required client error status codes (4xx)', () => {
      expect(HTTP_CONSTANTS.STATUS_CODES.BAD_REQUEST).toBe(400);
      expect(HTTP_CONSTANTS.STATUS_CODES.UNAUTHORIZED).toBe(401);
      expect(HTTP_CONSTANTS.STATUS_CODES.FORBIDDEN).toBe(403);
      expect(HTTP_CONSTANTS.STATUS_CODES.NOT_FOUND).toBe(404);
      expect(HTTP_CONSTANTS.STATUS_CODES.METHOD_NOT_ALLOWED).toBe(405);
      expect(HTTP_CONSTANTS.STATUS_CODES.CONFLICT).toBe(409);
      expect(HTTP_CONSTANTS.STATUS_CODES.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HTTP_CONSTANTS.STATUS_CODES.TOO_MANY_REQUESTS).toBe(429);
    });

    it('should have all required server error status codes (5xx)', () => {
      expect(HTTP_CONSTANTS.STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_CONSTANTS.STATUS_CODES.NOT_IMPLEMENTED).toBe(501);
      expect(HTTP_CONSTANTS.STATUS_CODES.BAD_GATEWAY).toBe(502);
      expect(HTTP_CONSTANTS.STATUS_CODES.SERVICE_UNAVAILABLE).toBe(503);
      expect(HTTP_CONSTANTS.STATUS_CODES.GATEWAY_TIMEOUT).toBe(504);
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        HTTP_CONSTANTS.STATUS_CODES.OK = 201;
      }).toThrow();
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all required general HTTP error messages', () => {
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST).toBe('请求参数错误');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.UNAUTHORIZED).toBe('未授权访问');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.FORBIDDEN).toBe('访问被禁止');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.NOT_FOUND).toBe('资源不存在');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR).toBe('服务器内部错误');
    });

    it('should have authentication related error messages', () => {
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.INVALID_CREDENTIALS).toBe('用户名或密码错误');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.TOKEN_EXPIRED).toBe('token已过期');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.API_KEY_INVALID).toBe('API Key无效');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS).toBe('权限不足');
    });

    it('should have business operation error messages', () => {
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.OPERATION_FAILED).toBe('操作失败');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.DATA_NOT_FOUND).toBe('数据不存在');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.VALIDATION_FAILED).toBe('验证失败');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.PROCESSING_FAILED).toBe('处理失败');
    });

    it('should have resource related error messages', () => {
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.RESOURCE_NOT_FOUND).toBe('资源不存在');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.RESOURCE_ALREADY_EXISTS).toBe('资源已存在');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.RESOURCE_LOCKED).toBe('资源被锁定');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.RESOURCE_EXPIRED).toBe('资源已过期');
    });

    it('should have network and connection error messages', () => {
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.CONNECTION_FAILED).toBe('连接失败');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.TIMEOUT_ERROR).toBe('请求超时');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.NETWORK_ERROR).toBe('网络错误');
    });

    it('should have data related error messages', () => {
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.DATA_CORRUPTION).toBe('数据损坏');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.DATA_SYNC_FAILED).toBe('数据同步失败');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.CACHE_ERROR).toBe('缓存错误');
      expect(HTTP_CONSTANTS.ERROR_MESSAGES.DATABASE_ERROR).toBe('数据库错误');
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        HTTP_CONSTANTS.ERROR_MESSAGES.BAD_REQUEST = '修改的消息';
      }).toThrow();
    });
  });

  describe('SUCCESS_MESSAGES', () => {
    it('should have all required success messages', () => {
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.OPERATION_SUCCESS).toBe('操作成功');
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.CREATE_SUCCESS).toBe('创建成功');
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.UPDATE_SUCCESS).toBe('更新成功');
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.DELETE_SUCCESS).toBe('删除成功');
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.QUERY_SUCCESS).toBe('查询成功');
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.VALIDATION_SUCCESS).toBe('验证成功');
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.PROCESS_SUCCESS).toBe('处理成功');
      expect(HTTP_CONSTANTS.SUCCESS_MESSAGES.SYNC_SUCCESS).toBe('同步成功');
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        HTTP_CONSTANTS.SUCCESS_MESSAGES.OPERATION_SUCCESS = '修改的消息';
      }).toThrow();
    });
  });
});

describe('isSuccessStatusCode', () => {
  it('should return true for 2xx status codes', () => {
    expect(isSuccessStatusCode(200)).toBe(true);
    expect(isSuccessStatusCode(201)).toBe(true);
    expect(isSuccessStatusCode(202)).toBe(true);
    expect(isSuccessStatusCode(204)).toBe(true);
    expect(isSuccessStatusCode(299)).toBe(true);
  });

  it('should return false for non-2xx status codes', () => {
    expect(isSuccessStatusCode(199)).toBe(false);
    expect(isSuccessStatusCode(300)).toBe(false);
    expect(isSuccessStatusCode(400)).toBe(false);
    expect(isSuccessStatusCode(500)).toBe(false);
  });

  it('should handle boundary values', () => {
    expect(isSuccessStatusCode(200)).toBe(true);  // Lower boundary
    expect(isSuccessStatusCode(299)).toBe(true);  // Upper boundary
    expect(isSuccessStatusCode(199)).toBe(false); // Below range
    expect(isSuccessStatusCode(300)).toBe(false); // Above range
  });
});

describe('isClientErrorStatusCode', () => {
  it('should return true for 4xx status codes', () => {
    expect(isClientErrorStatusCode(400)).toBe(true);
    expect(isClientErrorStatusCode(401)).toBe(true);
    expect(isClientErrorStatusCode(404)).toBe(true);
    expect(isClientErrorStatusCode(429)).toBe(true);
    expect(isClientErrorStatusCode(499)).toBe(true);
  });

  it('should return false for non-4xx status codes', () => {
    expect(isClientErrorStatusCode(399)).toBe(false);
    expect(isClientErrorStatusCode(500)).toBe(false);
    expect(isClientErrorStatusCode(200)).toBe(false);
    expect(isClientErrorStatusCode(300)).toBe(false);
  });

  it('should handle boundary values', () => {
    expect(isClientErrorStatusCode(400)).toBe(true);  // Lower boundary
    expect(isClientErrorStatusCode(499)).toBe(true);  // Upper boundary
    expect(isClientErrorStatusCode(399)).toBe(false); // Below range
    expect(isClientErrorStatusCode(500)).toBe(false); // Above range
  });
});

describe('isServerErrorStatusCode', () => {
  it('should return true for 5xx status codes', () => {
    expect(isServerErrorStatusCode(500)).toBe(true);
    expect(isServerErrorStatusCode(501)).toBe(true);
    expect(isServerErrorStatusCode(502)).toBe(true);
    expect(isServerErrorStatusCode(503)).toBe(true);
    expect(isServerErrorStatusCode(504)).toBe(true);
    expect(isServerErrorStatusCode(599)).toBe(true);
  });

  it('should return false for non-5xx status codes', () => {
    expect(isServerErrorStatusCode(499)).toBe(false);
    expect(isServerErrorStatusCode(600)).toBe(false);
    expect(isServerErrorStatusCode(400)).toBe(false);
    expect(isServerErrorStatusCode(200)).toBe(false);
  });

  it('should handle boundary values', () => {
    expect(isServerErrorStatusCode(500)).toBe(true);  // Lower boundary
    expect(isServerErrorStatusCode(599)).toBe(true);  // Upper boundary
    expect(isServerErrorStatusCode(499)).toBe(false); // Below range
    expect(isServerErrorStatusCode(600)).toBe(false); // Above range
  });
});

describe('getErrorTypeByStatusCode', () => {
  it('should return "client" for 4xx status codes', () => {
    expect(getErrorTypeByStatusCode(400)).toBe('client');
    expect(getErrorTypeByStatusCode(404)).toBe('client');
    expect(getErrorTypeByStatusCode(429)).toBe('client');
    expect(getErrorTypeByStatusCode(499)).toBe('client');
  });

  it('should return "server" for 5xx status codes', () => {
    expect(getErrorTypeByStatusCode(500)).toBe('server');
    expect(getErrorTypeByStatusCode(502)).toBe('server');
    expect(getErrorTypeByStatusCode(504)).toBe('server');
    expect(getErrorTypeByStatusCode(599)).toBe('server');
  });

  it('should return "unknown" for non-error status codes', () => {
    expect(getErrorTypeByStatusCode(200)).toBe('unknown');
    expect(getErrorTypeByStatusCode(201)).toBe('unknown');
    expect(getErrorTypeByStatusCode(300)).toBe('unknown');
    expect(getErrorTypeByStatusCode(301)).toBe('unknown');
  });

  it('should return "unknown" for invalid status codes', () => {
    expect(getErrorTypeByStatusCode(100)).toBe('unknown');
    expect(getErrorTypeByStatusCode(600)).toBe('unknown');
    expect(getErrorTypeByStatusCode(999)).toBe('unknown');
    expect(getErrorTypeByStatusCode(-1)).toBe('unknown');
    expect(getErrorTypeByStatusCode(0)).toBe('unknown');
  });

  it('should handle boundary values correctly', () => {
    expect(getErrorTypeByStatusCode(399)).toBe('unknown'); // Just below 4xx
    expect(getErrorTypeByStatusCode(400)).toBe('client');  // Start of 4xx
    expect(getErrorTypeByStatusCode(499)).toBe('client');  // End of 4xx
    expect(getErrorTypeByStatusCode(500)).toBe('server');  // Start of 5xx
    expect(getErrorTypeByStatusCode(599)).toBe('server');  // End of 5xx
    expect(getErrorTypeByStatusCode(600)).toBe('unknown'); // Just above 5xx
  });
});