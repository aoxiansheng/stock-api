/**
 * API请求辅助工具
 * 封装常用的API请求方法，简化测试代码
 */
import request from 'supertest';
import { ApiKeyPair } from './test-setup.helper';

/**
 * 使用JWT Token发送请求
 */
export class JwtRequest {
  constructor(
    private readonly httpServer: any,
    private readonly token: string,
  ) {}

  get(url: string) {
    return request(this.httpServer)
      .get(url)
      .set('Authorization', `Bearer ${this.token}`);
  }

  post(url: string) {
    return request(this.httpServer)
      .post(url)
      .set('Authorization', `Bearer ${this.token}`);
  }

  put(url: string) {
    return request(this.httpServer)
      .put(url)
      .set('Authorization', `Bearer ${this.token}`);
  }

  patch(url: string) {
    return request(this.httpServer)
      .patch(url)
      .set('Authorization', `Bearer ${this.token}`);
  }

  delete(url: string) {
    return request(this.httpServer)
      .delete(url)
      .set('Authorization', `Bearer ${this.token}`);
  }
}

/**
 * 使用API Key发送请求
 */
export class ApiKeyRequest {
  constructor(
    private readonly httpServer: any,
    private readonly apiKey: ApiKeyPair,
  ) {}

  get(url: string) {
    return request(this.httpServer)
      .get(url)
      .set('X-App-Key', this.apiKey.appKey)
      .set('X-Access-Token', this.apiKey.accessToken);
  }

  post(url: string) {
    return request(this.httpServer)
      .post(url)
      .set('X-App-Key', this.apiKey.appKey)
      .set('X-Access-Token', this.apiKey.accessToken);
  }

  put(url: string) {
    return request(this.httpServer)
      .put(url)
      .set('X-App-Key', this.apiKey.appKey)
      .set('X-Access-Token', this.apiKey.accessToken);
  }

  patch(url: string) {
    return request(this.httpServer)
      .patch(url)
      .set('X-App-Key', this.apiKey.appKey)
      .set('X-Access-Token', this.apiKey.accessToken);
  }

  delete(url: string) {
    return request(this.httpServer)
      .delete(url)
      .set('X-App-Key', this.apiKey.appKey)
      .set('X-Access-Token', this.apiKey.accessToken);
  }
}

/**
 * 数据接收器API
 */
export class ReceiverAPI {
  constructor(private readonly apiKeyRequest: ApiKeyRequest) {}

  /**
   * 接收实时数据
   */
  async receiveData(payload: {
    dataSource: string;
    symbols: string[];
    market: string;
    fields?: string[];
  }) {
    // 映射为后端 Receiver DataRequestDto 结构
    const body = {
      symbols: payload.symbols,
      receiverType: 'get-stock-quote',
      options: {
        preferredProvider: payload.dataSource,
        market: payload.market,
        fields: payload.fields,
      },
    };
    return this.apiKeyRequest
      .post('/api/v1/receiver/data')
      .send(body);
  }
}

/**
 * 查询API
 */
export class QueryAPI {
  constructor(private readonly apiKeyRequest: ApiKeyRequest) {}

  /**
   * 执行查询
   */
  async execute(payload: {
    type: string; // e.g. 'BY_SYMBOLS', 'BY_MARKET'
    symbols?: string[];
    market?: string;
    fields?: string[];
  }) {
    const mapType = (t: string) => t?.toLowerCase(); // 'BY_SYMBOLS' -> 'by_symbols'
    const body: any = {
      queryType: mapType(payload.type),
      symbols: payload.symbols,
      market: payload.market,
      options: payload.fields?.length ? { includeFields: payload.fields } : undefined,
    };
    return this.apiKeyRequest
      .post('/api/v1/query/execute')
      .send(body);
  }

  /**
   * 批量查询
   */
  async bulk(payload: {
    queries: Array<{
      type: string;
      symbols?: string[];
      market?: string;
    }>;
  }) {
    const mapType = (t: string) => t?.toLowerCase();
    const body = {
      queries: payload.queries.map((q) => ({
        queryType: mapType(q.type),
        symbols: q.symbols,
        market: q.market,
      })),
    };
    return this.apiKeyRequest
      .post('/api/v1/query/bulk')
      .send(body);
  }

  /**
   * 快速查询（通过symbols）
   */
  async queryBySymbols(symbols: string[]) {
    return this.apiKeyRequest
      .get(`/api/v1/query/symbols?symbols=${symbols.join(',')}`);
  }

  /**
   * 市场查询
   */
  async queryByMarket(market: string) {
    return this.apiKeyRequest
      .get(`/api/v1/query/market?market=${market}`);
  }
}

/**
 * 符号映射API（统一到 /api/v1/symbol-mapper/*）
 */
export class SymbolMapperAPI {
  constructor(private readonly jwtRequest: JwtRequest) {}

  /**
   * 批量转换股票代码（标准 → 指定提供商）
   */
  async transformSymbols(payload: { dataSourceName: string; symbols: string[] }) {
    return this.jwtRequest.post('/api/v1/symbol-mapper/transform').send(payload);
  }

  /**
   * 单个代码映射（标准 → 指定提供商）
   */
  async mapSymbol(payload: { symbol: string; fromProvider: string; toProvider: string }) {
    return this.jwtRequest.post('/api/v1/symbol-mapper/map').send(payload);
  }

  /**
   * 添加映射规则到现有数据源
   */
  async addRule(payload: { dataSourceName: string; symbolMappingRule: { standardSymbol: string; sdkSymbol: string; market?: string; symbolType?: string; isActive?: boolean; description?: string } }) {
    return this.jwtRequest.post('/api/v1/symbol-mapper/rules').send(payload);
  }

  /**
   * 查询映射规则
   */
  async getRules(params?: { format?: string; symbol?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.jwtRequest
      .get(`/api/v1/symbol-mapper/rules?${query}`);
  }
}

/**
 * 数据映射API（灵活映射规则）
 */
export class DataMapperAPI {
  constructor(private readonly jwtRequest: JwtRequest) {}

  /**
   * 创建灵活映射规则（CreateFlexibleMappingRuleDto）
   */
  async createFlexibleRule(payload: any) {
    return this.jwtRequest.post('/api/v1/data-mapper/rules').send(payload);
  }

  /**
   * 查询映射规则
   */
  async getRules(dataSource?: string) {
    const url = dataSource
      ? `/api/v1/data-mapper/rules?dataSource=${dataSource}`
      : '/api/v1/data-mapper/rules';
    return this.jwtRequest.get(url);
  }

  /**
   * 更新映射规则
   */
  async updateRule(ruleId: string, payload: any) {
    return this.jwtRequest
      .put(`/api/v1/data-mapper/rules/${ruleId}`)
      .send(payload);
  }

  /**
   * 删除映射规则
   */
  async deleteRule(ruleId: string) {
    return this.jwtRequest
      .delete(`/api/v1/data-mapper/rules/${ruleId}`);
  }
}

/**
 * 数据转换API（/api/v1/data-transformer/*）
 */
export class TransformerAPI {
  constructor(private readonly jwtRequest: JwtRequest) {}

  /**
   * 转换数据（DataTransformRequestDto）
   */
  async transform(payload: any) {
    return this.jwtRequest.post('/api/v1/data-transformer/data-transform').send(payload);
  }

  /**
   * 批量转换（DataTransformRequestDto[]）
   */
  async transformBatch(payload: any[]) {
    return this.jwtRequest.post('/api/v1/data-transformer/data-transform-batch').send(payload);
  }
}

/**
 * 存储API（仅持久化）
 */
export class StorageAPI {
  constructor(private readonly jwtRequest: JwtRequest) {}

  /**
   * 存储数据
   */
  async store(payload: any) {
    return this.jwtRequest.post('/api/v1/storage/store').send(payload);
  }

  /**
   * 检索数据
   */
  async retrieve(payload: any) {
    return this.jwtRequest.post('/api/v1/storage/retrieve').send(payload);
  }

  /** 获取统计信息 */
  async getStats() {
    return this.jwtRequest.get('/api/v1/storage/stats');
  }

  /** 删除键 */
  async delete(key: string, storageType?: string) {
    const q = storageType ? `?storageType=${encodeURIComponent(storageType)}` : '';
    return this.jwtRequest.delete(`/api/v1/storage/${encodeURIComponent(key)}${q}`);
  }
}

/**
 * API工厂类 - 统一创建所有API实例
 */
export class APIFactory {
  constructor(
    private readonly httpServer: any,
    private readonly jwtToken?: string,
    private readonly apiKey?: ApiKeyPair,
  ) {}

  /**
   * 创建JWT请求实例
   */
  createJwtRequest(): JwtRequest {
    if (!this.jwtToken) {
      throw new Error('JWT token is required');
    }
    return new JwtRequest(this.httpServer, this.jwtToken);
  }

  /**
   * 创建API Key请求实例
   */
  createApiKeyRequest(): ApiKeyRequest {
    if (!this.apiKey) {
      throw new Error('API Key is required');
    }
    return new ApiKeyRequest(this.httpServer, this.apiKey);
  }

  /**
   * 创建Receiver API
   */
  createReceiverAPI(): ReceiverAPI {
    return new ReceiverAPI(this.createApiKeyRequest());
  }

  /**
   * 创建Query API
   */
  createQueryAPI(): QueryAPI {
    return new QueryAPI(this.createApiKeyRequest());
  }

  /**
   * 创建Symbol Mapper API
   */
  createSymbolMapperAPI(): SymbolMapperAPI {
    return new SymbolMapperAPI(this.createJwtRequest());
  }

  /**
   * 创建Data Mapper API
   */
  createDataMapperAPI(): DataMapperAPI {
    return new DataMapperAPI(this.createJwtRequest());
  }

  /**
   * 创建Transformer API
   */
  createTransformerAPI(): TransformerAPI {
    return new TransformerAPI(this.createJwtRequest());
  }

  /**
   * 创建Storage API
   */
  createStorageAPI(): StorageAPI {
    return new StorageAPI(this.createJwtRequest());
  }
}
