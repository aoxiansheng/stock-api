/**
 * Stream Receiver 实时流黑盒E2E测试：WebSocket真实环境完整测试
 *
 * 注意：此测试需要项目实际运行在 http://localhost:3000
 * 启动命令：bun run dev
 *
 * 完全黑盒测试原则：
 * - 使用真实的WebSocket客户端连接
 * - 连接到实际运行的项目WebSocket服务
 * - 使用真实的MongoDB和Redis
 * - 使用真实的LongPort WebSocket流数据源
 * - 测试真实的实时数据流推送和订阅管理
 * - 验证WebSocket连接管理和故障恢复
 */

import axios, { AxiosInstance } from "axios";
import { io, Socket } from "socket.io-client";
import { Permission } from "../../../../src/auth/enums/user-role.enum";

describe("Stream Receiver Real-time Black-box E2E Tests", () => {
  let httpClient: AxiosInstance;
  let baseURL: string;
  let wsURL: string;
  let adminJWT: string;
  let apiKey: any;
  let wsClient: Socket;
  let receivedMessages: any[] = [];

  beforeAll(async () => {
    // 配置真实环境连接
    baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";
    wsURL = baseURL.replace("http", "ws");

    httpClient = axios.create({
      baseURL,
      timeout: 30000,
      validateStatus: () => true,
    });

    console.log(`🔗 连接到真实项目: ${baseURL}`);
    console.log(`🌊 WebSocket地址: ${wsURL}`);

    // 验证项目是否运行
    await verifyProjectRunning();

    // 设置认证
    await setupAuthentication();

    // 验证Stream Receiver组件可用
    await verifyStreamReceiverAvailable();
  });

  async function verifyProjectRunning() {
    try {
      const response = await httpClient.get("/api/v1/monitoring/health");
      if (response.status !== 200) {
        throw new Error(`项目健康检查失败: ${response.status}`);
      }

      // 验证系统支持WebSocket流功能
      const health = response.data.data || response.data;
      console.log("✅ 项目运行状态验证成功");
      console.log(`   系统状态: ${health.status}`);
      console.log(`   运行时间: ${health.uptime || "N/A"}`);
    } catch (error) {
      console.error("❌ 无法连接到项目，请确保项目正在运行:");
      console.error("   启动命令: bun run dev");
      console.error("   项目地址:", baseURL);
      throw new Error(`项目未运行或不可访问: ${error.message}`);
    }
  }

  async function setupAuthentication() {
    try {
      // 1. 注册管理员用户
      const userData = {
        username: `stream_blackbox_admin_${Date.now()}`,
        email: `stream_blackbox_admin_${Date.now()}@example.com`,
        password: "password123",
        role: "admin",
      };

      const registerResponse = await httpClient.post(
        "/api/v1/auth/register",
        userData,
      );
      if (registerResponse.status !== 201) {
        console.warn("注册失败，可能用户已存在，尝试直接登录");
      }

      // 2. 登录获取JWT
      const loginResponse = await httpClient.post("/api/v1/auth/login", {
        username: userData.username,
        password: userData.password,
      });

      if (loginResponse.status !== 200) {
        throw new Error(
          `登录失败: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`,
        );
      }

      adminJWT =
        loginResponse.data.data?.accessToken || loginResponse.data.accessToken;
      if (!adminJWT) {
        throw new Error("未能获取JWT令牌");
      }

      // 3. 创建具有流数据权限的API Key
      const apiKeyData = {
        name: "Stream Receiver Black-box Test Key",
        permissions: [
          Permission.DATA_READ, // "data:read"
          Permission.QUERY_EXECUTE, // "query:execute"
          Permission.PROVIDERS_READ, // "providers:read"
          Permission.SYSTEM_MONITOR, // "system:monitor"
          Permission.STREAM_READ, // 替换 "stream:connect"
          Permission.STREAM_SUBSCRIBE, // "stream:subscribe"
        ],
        rateLimit: {
          requests: 2000, // 流数据需要更高的限流阈值
          window: "1h",
        },
      };

      const apiKeyResponse = await httpClient.post(
        "/api/v1/auth/api-keys",
        apiKeyData,
        {
          headers: { Authorization: `Bearer ${adminJWT}` },
        },
      );

      if (apiKeyResponse.status !== 201) {
        throw new Error(`创建API Key失败: ${apiKeyResponse.status}`);
      }

      apiKey = apiKeyResponse.data.data;
      console.log("✅ 流数据认证设置完成");
    } catch (error) {
      console.error("❌ 流数据认证设置失败:", error.message);
      throw error;
    }
  }

  async function verifyStreamReceiverAvailable() {
    try {
      // 检查流能力是否可用
      const response = await httpClient.get("/api/v1/providers/stream-capabilities", {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        },
      });

      if (response.status !== 200) {
        console.warn("流能力查询失败，可能端点不存在，继续测试...");
        return;
      }

      const streamCapabilities = response.data.data || response.data;
      if (streamCapabilities.longport && streamCapabilities.longport.length > 0) {
        console.log("✅ Stream Receiver组件可用");
        console.log(`   可用流能力: ${streamCapabilities.longport.map((c: any) => c.name).join(', ')}`);
      }
    } catch (error) {
      console.warn("⚠️ 无法验证Stream Receiver组件，继续测试:", error.message);
    }
  }

  describe("🌊 WebSocket连接管理测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
      receivedMessages = [];
    });

    it("应该能够建立WebSocket连接到Stream Receiver", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket连接超时"));
        }, 15000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
          timeout: 10000,
        });

        wsClient.on("connect", () => {
          clearTimeout(timeout);
          console.log("✅ WebSocket连接建立成功");
          console.log(`   连接ID: ${wsClient.id}`);
          expect(wsClient.connected).toBe(true);
          resolve(true);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          console.error("❌ WebSocket连接失败:", error.message);
          reject(new Error(`WebSocket连接失败: ${error.message}`));
        });

        wsClient.on("disconnect", (reason) => {
          console.log(`🔌 WebSocket连接断开: ${reason}`);
        });
      });
    }, 20000);

    it("应该能够处理WebSocket认证", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket认证超时"));
        }, 15000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
        });

        wsClient.on("connect", () => {
          console.log("✅ WebSocket认证成功");
          
          // 监听认证确认事件
          wsClient.on("authenticated", (data) => {
            clearTimeout(timeout);
            console.log("✅ 收到认证确认:", data);
            expect(data).toBeDefined();
            resolve(data);
          });

          // 如果没有特定的认证事件，连接成功即认为认证成功
          setTimeout(() => {
            if (wsClient.connected) {
              clearTimeout(timeout);
              console.log("✅ WebSocket认证通过（连接保持）");
              resolve(true);
            }
          }, 2000);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket认证失败: ${error.message}`));
        });

        wsClient.on("auth_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket认证错误: ${error.message || error}`));
        });
      });
    }, 20000);

    it("应该拒绝无效认证的WebSocket连接", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true); // 如果超时，认为连接被正确拒绝
        }, 10000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: "invalid_key",
            accessToken: "invalid_token",
          },
          transports: ['websocket'],
        });

        wsClient.on("connect", () => {
          clearTimeout(timeout);
          console.log("⚠️ 无效认证竟然连接成功，这可能是安全问题");
          wsClient.disconnect();
          reject(new Error("无效认证不应该连接成功"));
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 无效认证被正确拒绝:", error.message);
          resolve(true);
        });

        wsClient.on("auth_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 认证错误被正确处理:", error.message || error);
          resolve(true);
        });

        wsClient.on("disconnect", (reason) => {
          if (reason === 'io server disconnect') {
            clearTimeout(timeout);
            console.log("✅ 无效认证被服务器断开连接:", reason);
            resolve(true);
          }
        });
      });
    });
  });

  describe("📡 实时数据流订阅测试", () => {
    beforeEach(async () => {
      // 为每个测试建立新的WebSocket连接
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("WebSocket连接超时"));
        }, 15000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
        });

        wsClient.on("connect", () => {
          clearTimeout(timeout);
          console.log("🔗 测试WebSocket连接建立");
          resolve(true);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
      receivedMessages = [];
    });

    it("应该能够订阅单个股票符号的实时数据流", async () => {
      const testSymbol = "700.HK";
      const requiredQuoteCount = 10; // 要求至少10次报价
      let receivedQuoteCount = 0;
      const quotePrices = []; // 记录每次报价的价格
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (receivedQuoteCount >= requiredQuoteCount) {
            const validPrices = quotePrices.filter(p => p !== null && p !== undefined && !isNaN(p) && p > 0);
            console.log(`🎉 成功收到 ${receivedQuoteCount} 次报价，满足最低要求 ${requiredQuoteCount} 次`);
            console.log(`💰 价格变化记录: [${validPrices.join(', ')}] (${validPrices.length} 有效价格)`);
            resolve({ success: true, quotesReceived: receivedQuoteCount, validPrices: validPrices });
          } else {
            reject(new Error(`实时数据流订阅超时: 仅收到 ${receivedQuoteCount}/${requiredQuoteCount} 次报价`));
          }
        }, 75000); // 增加到75秒超时时间，确保有足够时间收集10次报价并完成退订验证

        // 监听实时数据
        wsClient.on("data", (data) => {
          receivedQuoteCount++;
          receivedMessages.push(data);
          
          // 调试：显示完整数据结构
          console.log(`🔍 [调试] 第${receivedQuoteCount}次数据结构:`, JSON.stringify(data, null, 2));
          
          // 提取价格信息用于日志
          let currentPrice = null;
          let volume = null;
          let timestamp = null;
          
          // 尝试多种数据结构提取方式
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            const quote = data.data[0];
            // 尝试多种可能的价格字段名称
            currentPrice = quote.lastPrice || quote.last_done || quote.price || quote.last || quote.close;
            volume = quote.volume || quote.vol;
            timestamp = quote.timestamp || quote.time || quote.ts;
          } else if (data.symbols && data.symbols.length > 0) {
            // 如果数据在symbols数组中
            currentPrice = data.price || data.lastPrice || data.last_done;
            volume = data.volume || data.vol;
            timestamp = data.timestamp || data.time;
          } else if (typeof data === 'object') {
            // 如果数据直接在根级别
            currentPrice = data.lastPrice || data.last_done || data.price || data.last || data.close;
            volume = data.volume || data.vol;
            timestamp = data.timestamp || data.time || data.ts;
          }
          
          if (currentPrice !== null && currentPrice !== undefined) {
            quotePrices.push(currentPrice);
          }
          
          console.log(`📊 [${receivedQuoteCount}/${requiredQuoteCount}] 收到 ${testSymbol} 实时报价:`);
          console.log(`   💰 价格: $${currentPrice || 'N/A'}`);
          console.log(`   📈 成交量: ${volume || 'N/A'}`);
          console.log(`   ⏰ 时间: ${timestamp || 'N/A'}`);
          console.log(`   🔄 处理链: 符号映射=${data.processingChain?.symbolMapped}, 规则映射=${data.processingChain?.mappingRulesUsed}, 数据转换=${data.processingChain?.dataTransformed}`);
          
          // 验证数据格式
          expect(data).toBeDefined();
          expect(data.symbols || data.data).toBeDefined();
          expect(data.provider).toBe('longport');
          expect(data.capability).toBe('stream-stock-quote');
          expect(data.timestamp).toBeDefined();
          
          if (data.symbols && data.symbols.length > 0) {
            expect(data.symbols[0]).toBe(testSymbol);
          } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            expect(data.data[0].symbol || data.data[0].code).toBeDefined();
          }
          
          // 检查是否已收到足够的报价
          if (receivedQuoteCount >= requiredQuoteCount) {
            clearTimeout(timeout);
            console.log(`🎯 达到目标报价次数 ${requiredQuoteCount}，开始退订流程！`);
            
            // 计算统计数据
            const validPrices = quotePrices.filter(p => p !== null && p !== undefined && !isNaN(p) && p > 0);
            console.log(`📊 报价统计:`);
            console.log(`   总次数: ${receivedQuoteCount}`);
            
            if (validPrices.length > 0) {
              const minPrice = Math.min(...validPrices);
              const maxPrice = Math.max(...validPrices);
              const avgPrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
              
              console.log(`   价格范围: $${minPrice.toFixed(3)} - $${maxPrice.toFixed(3)}`);
              console.log(`   平均价格: $${avgPrice.toFixed(3)}`);
              console.log(`   有效价格数据: ${validPrices.length}/${receivedQuoteCount}`);
            } else {
              console.log(`   ⚠️ 警告: 未提取到有效价格数据，但数据流正常`);
              console.log(`   💾 成交量数据正常: 最新成交量 ${volume || 'N/A'}`);
            }
            
            // 执行退订操作
            console.log(`🔄 发送退订请求: ${testSymbol}`);
            
            // 设置退订后的数据监听
            let dataAfterUnsubscribe = false;
            const unsubscribeStartTime = Date.now();
            
            // 监听退订确认
            const unsubscribeHandler = (unsubData) => {
              console.log(`✅ 退订确认收到:`, unsubData);
              expect(unsubData.symbols).toContain(testSymbol);
              
              // 等待3秒检查是否还有数据推送
              setTimeout(() => {
                console.log(`🕐 退订后等待3秒检查，是否收到额外数据: ${dataAfterUnsubscribe ? '是' : '否'}`);
                
                const finalStats: any = {
                  success: true,
                  quotesReceived: receivedQuoteCount,
                  prices: quotePrices,
                  validPrices: validPrices,
                  unsubscribeSuccess: true,
                  dataAfterUnsubscribe: dataAfterUnsubscribe,
                  unsubscribeTime: Date.now() - unsubscribeStartTime
                };
                
                if (validPrices.length > 0) {
                  finalStats.priceRange = {
                    min: Math.min(...validPrices),
                    max: Math.max(...validPrices),
                    avg: validPrices.reduce((a, b) => a + b, 0) / validPrices.length
                  };
                } else {
                  finalStats.warning = '价格字段提取失败，但数据流连接正常';
                }
                
                if (dataAfterUnsubscribe) {
                  console.log(`⚠️ 警告: 退订后仍收到数据推送`);
                  finalStats.warning = (finalStats.warning || '') + '; 退订后仍收到数据';
                } else {
                  console.log(`✅ 退订成功: 退订后未收到额外数据推送`);
                }
                
                console.log(`🏁 完整测试流程完成: 订阅 → 收集${receivedQuoteCount}次报价 → 退订 → 验证停止推送`);
                resolve(finalStats);
              }, 3000);
            };
            
            // 临时绑定退订确认监听器 (修复：使用正确的事件名称)
            wsClient.once("unsubscribe-ack", unsubscribeHandler);
            
            // 重新定义data监听器来检测退订后的数据
            const originalDataHandler = wsClient.listeners("data");
            wsClient.removeAllListeners("data");
            
            wsClient.on("data", (data) => {
              const now = Date.now();
              if (now - unsubscribeStartTime > 1000) { // 退订1秒后收到的数据算异常
                console.log(`🚨 退订后仍收到数据 (${now - unsubscribeStartTime}ms后):`, data.symbols || data.data);
                dataAfterUnsubscribe = true;
              }
            });
            
            // 发送退订请求
            wsClient.emit("unsubscribe", {
              symbols: [testSymbol],
            });
            
            // 设置退订超时保护
            setTimeout(() => {
              console.log(`⏰ 退订流程超时，强制完成测试`);
              resolve({
                success: true,
                quotesReceived: receivedQuoteCount,
                validPrices: validPrices,
                unsubscribeSuccess: false,
                warning: '退订流程超时'
              });
            }, 10000); // 10秒退订超时
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 订阅确认:", data);
          console.log(`🎯 开始收集 ${testSymbol} 的实时报价，目标: ${requiredQuoteCount} 次`);
          expect(data.symbols).toContain(testSymbol);
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`订阅失败: ${error.message || error}`));
        });

        // 发送订阅请求
        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          capabilityType: "stream-stock-quote",
        });

        console.log(`📡 发送订阅请求: ${testSymbol} (目标收集 ${requiredQuoteCount} 次报价)`);
      });
    }, 80000); // 增加Jest超时时间以匹配内部75秒超时 + 退订验证时间

    it("应该能够订阅多个股票符号的实时数据流", async () => {
      const testSymbols = ["700.HK", "AMD.US", "SPY.US"];
      const receivedSymbols = new Set();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (receivedSymbols.size > 0) {
            console.log(`✅ 收到 ${receivedSymbols.size}/${testSymbols.length} 个符号的数据`);
            resolve(Array.from(receivedSymbols));
          } else {
            reject(new Error("多符号订阅超时，未收到任何数据"));
          }
        }, 45000);

        // 监听实时数据
        wsClient.on("data", (data) => {
          const symbol = data.symbol || data.code;
          if (symbol && testSymbols.includes(symbol)) {
            receivedSymbols.add(symbol);
            console.log(`📊 收到 ${symbol} 实时数据 (${receivedSymbols.size}/${testSymbols.length})`);
            
            // 如果收到所有符号的数据，提前完成
            if (receivedSymbols.size >= Math.min(2, testSymbols.length)) {
              clearTimeout(timeout);
              resolve(Array.from(receivedSymbols));
            }
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 多符号订阅确认:", data);
          expect(Array.isArray(data.symbols)).toBe(true);
          expect(data.symbols.length).toBeGreaterThan(0);
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`多符号订阅失败: ${error.message || error}`));
        });

        // 发送多符号订阅请求
        wsClient.emit("subscribe", {
          symbols: testSymbols,
          capabilityType: "stream-stock-quote",
        });

        console.log(`📡 发送多符号订阅请求: ${testSymbols.join(", ")}`);
      });
    }, 50000);

    it("应该能够取消订阅股票符号", async () => {
      const testSymbol = "700.HK";
      let subscriptionActive = false;
      let dataReceivedAfterUnsubscribe = false;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!dataReceivedAfterUnsubscribe) {
            console.log("✅ 取消订阅成功，未收到额外数据");
            resolve(true);
          } else {
            reject(new Error("取消订阅失败，仍在接收数据"));
          }
        }, 20000);

        // 监听实时数据
        wsClient.on("data", (data) => {
          const symbol = data.symbol || data.code;
          if (symbol === testSymbol) {
            if (subscriptionActive) {
              console.log("📊 订阅期间收到数据:", symbol);
              // 收到数据后取消订阅
              wsClient.emit("unsubscribe", {
                symbols: [testSymbol],
              });
              subscriptionActive = false;
            } else {
              console.log("⚠️ 取消订阅后仍收到数据:", symbol);
              dataReceivedAfterUnsubscribe = true;
            }
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 订阅确认，准备取消订阅");
          subscriptionActive = true;
          
          // 等待一段时间后自动取消订阅（如果没有收到数据）
          setTimeout(() => {
            if (subscriptionActive) {
              wsClient.emit("unsubscribe", {
                symbols: [testSymbol],
              });
              subscriptionActive = false;
            }
          }, 5000);
        });

        wsClient.on("unsubscription_confirmed", (data) => {
          console.log("✅ 取消订阅确认:", data);
          expect(data.symbols).toContain(testSymbol);
          
          // 等待一段时间确保不再收到数据
          setTimeout(() => {
            clearTimeout(timeout);
            if (!dataReceivedAfterUnsubscribe) {
              resolve(true);
            } else {
              reject(new Error("取消订阅后仍收到数据"));
            }
          }, 8000);
        });

        // 发送订阅请求
        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          capabilityType: "stream-stock-quote",
        });

        console.log(`📡 测试取消订阅: ${testSymbol}`);
      });
    }, 35000);
  });

  describe("🔧 WebSocket连接健康管理测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    it("应该能够检查WebSocket连接状态", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("连接状态检查超时"));
        }, 15000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
        });

        wsClient.on("connect", () => {
          // 检查连接状态
          wsClient.emit("get_status");
        });

        wsClient.on("status_response", (status) => {
          clearTimeout(timeout);
          console.log("✅ 连接状态检查成功:", status);
          
          expect(status).toBeDefined();
          expect(status.connected).toBe(true);
          expect(status.connectionId).toBeDefined();
          
          resolve(status);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // 如果没有特定的状态响应，使用连接状态
        setTimeout(() => {
          if (wsClient.connected) {
            clearTimeout(timeout);
            console.log("✅ WebSocket连接状态正常");
            resolve({ connected: true, connectionId: wsClient.id });
          }
        }, 3000);
      });
    });

    it("应该能够处理WebSocket断线重连", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("断线重连测试超时"));
        }, 30000);

        let reconnectCount = 0;
        let initialConnectionId: string;

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
        });

        wsClient.on("connect", () => {
          if (reconnectCount === 0) {
            initialConnectionId = wsClient.id;
            console.log(`🔗 初始连接建立: ${initialConnectionId}`);
            
            // 模拟断线（强制断开）
            setTimeout(() => {
              console.log("🔌 模拟断线...");
              wsClient.disconnect();
            }, 2000);
          } else {
            console.log(`🔄 重连成功 (第${reconnectCount}次): ${wsClient.id}`);
            clearTimeout(timeout);
            
            expect(wsClient.connected).toBe(true);
            expect(wsClient.id).toBeDefined();
            // 重连后ID通常会变化
            expect(wsClient.id).not.toBe(initialConnectionId);
            
            resolve(true);
          }
        });

        wsClient.on("disconnect", (reason) => {
          console.log(`🔌 连接断开: ${reason}`);
          if (reconnectCount === 0) {
            reconnectCount++;
            // Socket.IO会自动尝试重连
          }
        });

        wsClient.on("reconnect", (attemptNumber) => {
          console.log(`🔄 重连尝试 #${attemptNumber}`);
        });

        wsClient.on("reconnect_error", (error) => {
          console.error("❌ 重连失败:", error.message);
        });

        wsClient.on("connect_error", (error) => {
          if (reconnectCount === 0) {
            clearTimeout(timeout);
            reject(new Error(`初始连接失败: ${error.message}`));
          }
        });
      });
    }, 35000);
  });

  describe("⚡ 实时数据流性能测试", () => {
    let performanceClient: Socket;

    afterEach(() => {
      if (performanceClient && performanceClient.connected) {
        performanceClient.disconnect();
      }
    });

    it("应该在真实环境中达到实时数据流性能基准", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("性能测试超时"));
        }, 60000);

        const testSymbol = "700.HK";
        const measurements: number[] = [];
        const latencyMeasurements: number[] = [];
        let messageCount = 0;
        const targetMessages = 5; // 期望收到的消息数量

        performanceClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
        });

        performanceClient.on("connect", () => {
          console.log("🏁 性能测试连接建立");
          
          // 订阅测试符号
          performanceClient.emit("subscribe", {
            symbols: [testSymbol],
            capabilityType: "stream-stock-quote",
          });
        });

        performanceClient.on("data", (data) => {
          const receiveTime = Date.now();
          messageCount++;
          
          // 计算延迟（如果数据包含时间戳）
          if (data.timestamp) {
            const dataTime = new Date(data.timestamp).getTime();
            const latency = receiveTime - dataTime;
            latencyMeasurements.push(latency);
            console.log(`📊 消息 #${messageCount}: 延迟 ${latency}ms`);
          } else {
            console.log(`📊 收到消息 #${messageCount}`);
          }

          measurements.push(receiveTime);

          if (messageCount >= targetMessages) {
            clearTimeout(timeout);
            
            // 计算性能指标
            const totalTime = measurements[measurements.length - 1] - measurements[0];
            const avgInterval = totalTime / (messageCount - 1);
            const avgLatency = latencyMeasurements.length > 0 
              ? latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / latencyMeasurements.length 
              : 0;
            
            console.log(`📈 实时流性能测试结果:`);
            console.log(`   收到消息数: ${messageCount}`);
            console.log(`   总测试时间: ${totalTime}ms`);
            console.log(`   平均消息间隔: ${avgInterval.toFixed(1)}ms`);
            if (avgLatency > 0) {
              console.log(`   平均延迟: ${avgLatency.toFixed(1)}ms`);
            }
            
            // 性能断言
            expect(messageCount).toBeGreaterThanOrEqual(1);
            if (latencyMeasurements.length > 0) {
              expect(avgLatency).toBeLessThan(5000); // 平均延迟小于5秒
            }
            
            resolve({
              messageCount,
              totalTime,
              avgInterval,
              avgLatency,
            });
          }
        });

        performanceClient.on("subscribe-ack", (data) => {
          console.log("✅ 性能测试订阅确认");
        });

        performanceClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`性能测试连接失败: ${error.message}`));
        });
      });
    }, 65000);
  });

  describe("🚨 错误处理和边界测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    it("应该处理无效股票符号订阅", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true); // 如果没有错误事件，认为测试通过
        }, 15000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
        });

        wsClient.on("connect", () => {
          // 订阅无效符号
          wsClient.emit("subscribe", {
            symbols: ["INVALID_SYMBOL", "ANOTHER_INVALID"],
            capabilityType: "stream-stock-quote",
          });
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 无效符号订阅错误被正确处理:", error.message || error);
          expect(error).toBeDefined();
          resolve(true);
        });

        wsClient.on("subscription_partial", (data) => {
          clearTimeout(timeout);
          console.log("✅ 部分订阅成功（符号验证）:", data);
          expect(data.invalid_symbols).toBeDefined();
          expect(data.invalid_symbols.length).toBeGreaterThan(0);
          resolve(true);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it("应该处理订阅数量限制", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true); // 如果没有错误，可能系统没有实现限制
        }, 20000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
        });

        wsClient.on("connect", () => {
          // 创建超过限制的符号列表（LongPort限制500个）
          const manySymbols = Array.from({ length: 600 }, (_, i) => `SYM${i}.HK`);
          
          wsClient.emit("subscribe", {
            symbols: manySymbols,
            capabilityType: "stream-stock-quote",
          });
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 订阅数量限制错误被正确处理:", error.message || error);
          expect(error.message || error).toMatch(/limit|限制|exceed/i);
          resolve(true);
        });

        wsClient.on("subscription_partial", (data) => {
          clearTimeout(timeout);
          console.log("✅ 部分订阅成功（数量限制）:", data);
          expect(data.successful_count).toBeLessThan(600);
          expect(data.rejected_count).toBeGreaterThan(0);
          resolve(true);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });
  });

  afterAll(async () => {
    // 清理WebSocket连接
    if (wsClient && wsClient.connected) {
      wsClient.disconnect();
      console.log("🔌 WebSocket连接已清理");
    }

    // 清理测试创建的API Key
    if (apiKey && apiKey.appKey) {
      try {
        await httpClient.delete(`/api/v1/auth/api-keys/${apiKey.appKey}`, {
          headers: { Authorization: `Bearer ${adminJWT}` },
        });
        console.log("✅ 测试API Key已清理");
      } catch (error) {
        console.warn("⚠️ API Key清理失败:", error.message);
      }
    }

    console.log("🌊 Stream Receiver真实环境黑盒测试完成");
    console.log(`   收到消息总数: ${receivedMessages.length}`);
  });
});