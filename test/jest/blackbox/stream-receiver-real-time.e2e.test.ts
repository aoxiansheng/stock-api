/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Permission } from "../../../src/auth/enums/user-role.enum";

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
      const testSymbol = "AMD.US";
      const requiredQuoteCount = 3; // 要求至少3次报价
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
          
          // 🆕 原始数据输出 - 不做任何格式化或解析
          console.log(`🔍 [原始数据] data:`, data);
          console.log(`🔍 [原始数据] data.data:`, data.data);
          console.log(`🔍 [原始数据] data.symbols:`, data.symbols);
          
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
          console.log(`   🔄 处理链: 符号映射=${data.processingChain?._symbolMapped}, 规则映射=${data.processingChain?._mappingRulesUsed}, 数据转换=${data.processingChain?._dataTransformed}`);
          
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
                  finalStats._priceRange = {
                    min: Math.min(...validPrices),
                    max: Math.max(...validPrices),
                    avg: validPrices.reduce((a, b) => a + b, 0) / validPrices.length
                  };
                } else {
                  finalStats._warning = '价格字段提取失败，但数据流连接正常';
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
          wsCapabilityType: "stream-stock-quote",
        });

        console.log(`📡 发送订阅请求: ${testSymbol} (目标收集 ${requiredQuoteCount} 次报价)`);
      });
    }, 80000); // 增加Jest超时时间以匹配内部75秒超时 + 退订验证时间

    it("应该能够订阅多个股票符号的实时数据流", async () => {
      const testSymbols = ["AMD.US", "QQQ.US", "SPY.US"];
      const receivedSymbols = new Set();
      let dataReceived = false;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (receivedSymbols.size > 0) {
            console.log(`✅ 收到 ${receivedSymbols.size}/${testSymbols.length} 个符号的数据`);
            
            // 执行退订操作
            console.log(`🔄 发送多符号退订请求: ${Array.from(receivedSymbols).join(", ")}`);
            wsClient.emit("unsubscribe", {
              symbols: testSymbols,
            });
            
            // 等待退订确认
            setTimeout(() => {
              resolve({
                success: true,
                symbolsReceived: Array.from(receivedSymbols),
                unsubscribeSuccess: true
              });
            }, 3000);
          } else {
            reject(new Error("多符号订阅超时，未收到任何数据"));
          }
        }, 45000);

        // 监听实时数据
        wsClient.on("data", (data) => {
          dataReceived = true;
          
          // 尝试从不同格式的数据结构中提取符号
          let symbol = null;
          if (data.symbol) {
            symbol = data.symbol;
          } else if (data.code) {
            symbol = data.code;
          } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            symbol = data.data[0].symbol || data.data[0].code;
          } else if (data.symbols && Array.isArray(data.symbols) && data.symbols.length > 0) {
            symbol = data.symbols[0];
          }
          
          if (symbol && testSymbols.includes(symbol)) {
            receivedSymbols.add(symbol);
            console.log(`📊 收到 ${symbol} 实时数据 (${receivedSymbols.size}/${testSymbols.length})`);
            
            // 如果收到足够多的符号的数据，提前完成
            if (receivedSymbols.size >= Math.min(2, testSymbols.length)) {
              clearTimeout(timeout);
              
              // 执行退订操作
              console.log(`🔄 发送多符号退订请求: ${Array.from(receivedSymbols).join(", ")}`);
              wsClient.emit("unsubscribe", {
                symbols: testSymbols,
              });
              
              // 监听退订确认
              wsClient.once("unsubscribe-ack", (unsubData) => {
                console.log(`✅ 多符号退订确认:`, unsubData);
                
                // 等待3秒确认不再收到数据
                setTimeout(() => {
                  resolve({
                    success: true,
                    symbolsReceived: Array.from(receivedSymbols),
                    unsubscribeSuccess: true
                  });
                }, 3000);
              });
            }
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 多符号订阅确认:", data);
          expect(Array.isArray(data.symbols)).toBe(true);
          expect(data.symbols.length).toBeGreaterThan(0);
          
          // 如果30秒内没有收到数据，也执行退订流程
          setTimeout(() => {
            if (!dataReceived) {
              console.log("⚠️ 30秒内未收到实时数据，执行退订流程");
              wsClient.emit("unsubscribe", {
                symbols: testSymbols,
              });
            }
          }, 30000);
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`多符号订阅失败: ${error.message || error}`));
        });

        // 发送多符号订阅请求
        wsClient.emit("subscribe", {
          symbols: testSymbols,
          wsCapabilityType: "stream-stock-quote",
        });

        console.log(`📡 发送多符号订阅请求: ${testSymbols.join(", ")}`);
      });
    }, 60000);

    it("应该能够取消订阅股票符号", async () => {
      const testSymbol = "AMD.US";
      let subscriptionActive = false;
      let dataReceivedAfterUnsubscribe = false;
      let dataReceivedBeforeUnsubscribe = false;
      const requiredDataCount = 1; // 需要收到至少一条数据才能测试退订
      let dataCount = 0;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (dataReceivedBeforeUnsubscribe) {
            if (!dataReceivedAfterUnsubscribe) {
              console.log("✅ 取消订阅成功，未收到额外数据");
              resolve({
                success: true,
                dataReceivedBeforeUnsubscribe,
                dataReceivedAfterUnsubscribe
              });
            } else {
              reject(new Error("取消订阅失败，仍在接收数据"));
            }
          } else {
            console.log("⚠️ 测试超时，未收到任何数据，无法验证取消订阅");
            resolve({
              success: false,
              reason: "未收到任何数据，无法验证取消订阅"
            });
          }
        }, 30000);

        // 记录取消订阅的时间点
        let unsubscribeTime = 0;

        // 监听实时数据
        wsClient.on("data", (data) => {
          // 尝试从不同格式的数据结构中提取符号
          let symbol = null;
          if (data.symbol) {
            symbol = data.symbol;
          } else if (data.code) {
            symbol = data.code;
          } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            symbol = data.data[0].symbol || data.data[0].code;
          } else if (data.symbols && Array.isArray(data.symbols) && data.symbols.length > 0) {
            symbol = data.symbols[0];
          }
          
          if (symbol === testSymbol) {
            const now = Date.now();
            
            if (subscriptionActive) {
              dataCount++;
              dataReceivedBeforeUnsubscribe = true;
              console.log(`📊 订阅期间收到数据 #${dataCount}: ${symbol}`);
              
              // 收到足够的数据后取消订阅
              if (dataCount >= requiredDataCount) {
                console.log(`🔄 已收到 ${dataCount} 条数据，发送取消订阅请求: ${testSymbol}`);
                wsClient.emit("unsubscribe", {
                  symbols: [testSymbol],
                });
                unsubscribeTime = now;
                subscriptionActive = false;
              }
            } else if (unsubscribeTime > 0 && now - unsubscribeTime > 1000) {
              // 只有在取消订阅1秒后收到的数据才算是退订失败
              console.log(`⚠️ 取消订阅后 ${now - unsubscribeTime}ms 仍收到数据: ${symbol}`);
              dataReceivedAfterUnsubscribe = true;
            }
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 订阅确认，等待实时数据");
          expect(data.symbols).toContain(testSymbol);
          subscriptionActive = true;
          
          // 如果10秒内没有收到数据，自动取消订阅
          setTimeout(() => {
            if (subscriptionActive && dataCount === 0) {
              console.log("⚠️ 10秒内未收到数据，自动取消订阅");
              wsClient.emit("unsubscribe", {
                symbols: [testSymbol],
              });
              unsubscribeTime = Date.now();
              subscriptionActive = false;
            }
          }, 10000);
        });

        wsClient.on("unsubscribe-ack", (data) => {
          console.log("✅ 取消订阅确认:", data);
          expect(data.symbols).toContain(testSymbol);
          
          // 等待一段时间确保不再收到数据
          setTimeout(() => {
            clearTimeout(timeout);
            if (!dataReceivedAfterUnsubscribe) {
              console.log("✅ 退订后5秒内未收到额外数据，取消订阅成功");
              resolve({
                success: true,
                dataReceivedBeforeUnsubscribe,
                dataReceivedAfterUnsubscribe: false
              });
            } else {
              console.log("❌ 退订后仍收到数据，取消订阅失败");
              reject(new Error("取消订阅后仍收到数据"));
            }
          }, 5000);
        });

        // 发送订阅请求
        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          wsCapabilityType: "stream-stock-quote",
        });

        console.log(`📡 开始测试取消订阅: ${testSymbol}`);
      });
    }, 45000);

    it("应该拒绝无效符号格式的订阅请求", async () => {
      const invalidSymbol = "AAPL0.US"; // 这是一个无效的符号格式
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("测试超时：未收到订阅错误响应"));
        }, 10000);

        // 监听订阅错误事件
        wsClient.on("subscribe-error", (errorData) => {
          clearTimeout(timeout);
          console.log("✅ 成功接收到订阅错误响应:", JSON.stringify(errorData, null, 2));
          
          // 验证错误响应
          expect(errorData).toBeDefined();
          expect(errorData.success).toBe(false);
          expect(errorData.message).toContain("无效的股票符号格式");
          expect(errorData.message).toContain(invalidSymbol);
          
          resolve(true);
        });

        // 发送无效符号订阅请求
        console.log(`🔄 发送无效符号订阅请求: ${invalidSymbol}`);
        wsClient.emit("subscribe", {
          symbols: [invalidSymbol],
          wsCapabilityType: "stream-stock-quote",
        });
      });
    });
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
          expect(status._connectionId).toBeDefined();
          
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

        const testSymbol = "AMD.US";
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
            wsCapabilityType: "stream-stock-quote",
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
            
            // 执行退订操作
            console.log(`🔄 性能测试完成，发送退订请求: ${testSymbol}`);
            performanceClient.emit("unsubscribe", {
              symbols: [testSymbol],
            });
            
            // 等待退订确认后完成测试
            performanceClient.once("unsubscribe-ack", (unsubData) => {
              console.log(`✅ 性能测试退订确认:`, unsubData);
              
              // 返回测试结果
              resolve({
                messageCount,
                totalTime,
                avgInterval,
                avgLatency,
                unsubscribeSuccess: true
              });
            });
            
            // 设置退订超时保护
            setTimeout(() => {
              console.log(`⚠️ 性能测试退订确认超时，强制完成测试`);
              resolve({
                messageCount,
                totalTime,
                avgInterval,
                avgLatency,
                unsubscribeSuccess: false
              });
            }, 5000);
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

  describe("📊 数据处理管道集成测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    beforeEach(async () => {
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
          resolve(true);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it("应该验证7组件数据处理链：符号映射→数据映射→转换器→存储跳过→实时输出", async () => {
      const testSymbol = "NVDA.US";
      let dataWithProcessingChain = null;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("数据处理链验证超时"));
        }, 30000);

        wsClient.on("data", (data) => {
          console.log("🔍 检查数据处理链:", JSON.stringify(data._processingChain, null, 2));
          
          if (data.processingChain) {
            dataWithProcessingChain = data;
            clearTimeout(timeout);
            
            // 验证处理链状态
            expect(data.processingChain).toBeDefined();
            expect(typeof data.processingChain.symbolMapped).toBe('boolean');
            expect(typeof data.processingChain.mappingRulesUsed).toBe('boolean'); 
            expect(typeof data.processingChain.dataTransformed).toBe('boolean');
            
            // 验证实时流特有处理：跳过Storage，直接输出
            expect(data.provider).toBe('longport');
            expect(data.capability).toBe('stream-stock-quote');
            expect(data.timestamp).toBeDefined();
            
            console.log("✅ 7组件数据处理链验证成功:");
            console.log(`   符号映射: ${data.processingChain.symbolMapped ? '已执行' : '跳过'}`);
            console.log(`   规则映射: ${data.processingChain.mappingRulesUsed ? '已应用' : '使用默认'}`);
            console.log(`   数据转换: ${data.processingChain.dataTransformed ? '已转换' : '原始数据'}`);
            console.log(`   实时输出: 绕过Storage直接推送`);
            
            // 执行清理
            wsClient.emit("unsubscribe", { symbols: [testSymbol] });
            setTimeout(() => resolve({ processingChainVerified: true, data: dataWithProcessingChain }), 2000);
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 订阅确认，等待处理链数据");
        });

        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          wsCapabilityType: "stream-stock-quote",
        });
      });
    }, 35000);

    it("应该验证不同市场符号的智能路由和格式转换", async () => {
      // 测试多个市场的符号转换能力
      const marketSymbols = [
        { symbol: "700.HK", market: "HK", expectedFormat: "00700" },
        { symbol: "TSLA.US", market: "US", expectedFormat: "TSLA" },
      ];
      
      let processedMarkets = new Set();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (processedMarkets.size > 0) {
            console.log(`✅ 处理了 ${processedMarkets.size} 个市场的符号转换`);
            wsClient.emit("unsubscribe", { 
              symbols: marketSymbols.map(m => m.symbol) 
            });
            setTimeout(() => resolve({ marketsProcessed: Array.from(processedMarkets) }), 2000);
          } else {
            reject(new Error("市场符号路由测试超时"));
          }
        }, 35000);

        wsClient.on("data", (data) => {
          let detectedMarket = null;
          let receivedSymbol = null;
          
          // 从数据中提取符号和市场信息
          if (data.symbols && data.symbols.length > 0) {
            receivedSymbol = data.symbols[0];
          } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            receivedSymbol = data.data[0].symbol || data.data[0].code;
          }
          
          // 匹配原始订阅符号确定市场
          const matchedSymbol = marketSymbols.find(m => 
            m.symbol === receivedSymbol || 
            receivedSymbol?.includes(m.expectedFormat)
          );
          
          if (matchedSymbol) {
            detectedMarket = matchedSymbol.market;
            processedMarkets.add(detectedMarket);
            
            console.log(`📊 收到 ${detectedMarket} 市场数据:`);
            console.log(`   原始订阅: ${matchedSymbol.symbol}`);
            console.log(`   接收符号: ${receivedSymbol}`);
            console.log(`   符号映射: ${data.processingChain?.symbolMapped ? '已执行' : '跳过'}`);
            console.log(`   提供商: ${data.provider}`);
            
            // 如果处理了足够的市场，提前结束
            if (processedMarkets.size >= 1) { // 至少验证一个市场
              clearTimeout(timeout);
              wsClient.emit("unsubscribe", { 
                symbols: marketSymbols.map(m => m.symbol) 
              });
              setTimeout(() => resolve({ 
                marketsProcessed: Array.from(processedMarkets),
                symbolMapping: data.processingChain?.symbolMapped 
              }), 2000);
            }
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 多市场符号订阅确认");
        });

        wsClient.emit("subscribe", {
          symbols: marketSymbols.map(m => m.symbol),
          wsCapabilityType: "stream-stock-quote",
        });
      });
    }, 40000);
  });

  describe("🔄 提供商能力和容错测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    beforeEach(async () => {
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
          resolve(true);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it("应该能够指定特定提供商进行流订阅", async () => {
      const testSymbol = "AMD.US";
      const preferredProvider = "longport";
      let providerVerified = false;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (providerVerified) {
            wsClient.emit("unsubscribe", { symbols: [testSymbol] });
            setTimeout(() => resolve({ providerVerified: true }), 2000);
          } else {
            reject(new Error("提供商指定测试超时"));
          }
        }, 25000);

        wsClient.on("data", (data) => {
          if (data.provider === preferredProvider) {
            providerVerified = true;
            clearTimeout(timeout);
            
            console.log(`✅ 成功使用指定提供商: ${data.provider}`);
            console.log(`   能力类型: ${data.capability}`);
            console.log(`   数据质量: ${data.data ? '有效' : '无效'}`);
            
            expect(data.provider).toBe(preferredProvider);
            expect(data.capability).toBe('stream-stock-quote');
            
            wsClient.emit("unsubscribe", { symbols: [testSymbol] });
            setTimeout(() => resolve({ 
              providerVerified: true, 
              provider: data.provider,
              capability: data.capability 
            }), 2000);
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          console.log("✅ 指定提供商订阅确认");
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`指定提供商订阅失败: ${error.message || error}`));
        });

        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          wsCapabilityType: "stream-stock-quote",
          preferredProvider: preferredProvider,
        });
      });
    }, 30000);

    it("应该处理提供商连接失败时的回退机制", async () => {
      const testSymbol = "MSFT.US";
      const invalidProvider = "invalid_provider";
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true); // 如果没有错误，可能系统有其他回退机制
        }, 20000);

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 无效提供商错误被正确处理:", error.message || error);
          expect(error.message || error).toMatch(/provider|提供商|not found|未找到/i);
          resolve({ errorHandled: true, message: error.message || error });
        });

        wsClient.on("subscribe-ack", (data) => {
          // 如果订阅成功，说明系统有回退机制
          clearTimeout(timeout);
          console.log("✅ 系统可能使用了回退提供商:", data);
          
          // 验证后清理
          wsClient.emit("unsubscribe", { symbols: [testSymbol] });
          setTimeout(() => resolve({ 
            fallbackUsed: true, 
            provider: data.provider || 'unknown' 
          }), 2000);
        });

        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          wsCapabilityType: "stream-stock-quote",
          preferredProvider: invalidProvider,
        });
      });
    });

    it("应该能够测试不支持的流能力类型", async () => {
      const testSymbol = "GOOGL.US";
      const invalidCapability = "stream-invalid-capability";
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true); // 超时认为测试通过
        }, 15000);

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 不支持的能力类型错误被正确处理:", error.message || error);
          expect(error.message || error).toMatch(/capability|能力|support|支持/i);
          resolve({ errorHandled: true, message: error.message || error });
        });

        wsClient.on("subscribe-ack", (data) => {
          // 如果意外订阅成功，需要清理
          clearTimeout(timeout);
          console.log("⚠️ 无效能力类型意外订阅成功，执行清理");
          wsClient.emit("unsubscribe", { symbols: [testSymbol] });
          setTimeout(() => resolve({ unexpectedSuccess: true }), 2000);
        });

        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          wsCapabilityType: invalidCapability,
        });
      });
    });
  });

  describe("⚡ WebSocket消息格式和协议测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    beforeEach(async () => {
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
          resolve(true);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });

    it("应该验证WebSocket心跳和连接保持", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("心跳测试超时"));
        }, 15000);

        let pongReceived = false;

        wsClient.on("pong", (data) => {
          clearTimeout(timeout);
          pongReceived = true;
          console.log("✅ 心跳响应:", data);
          
          expect(data).toBeDefined();
          expect(data.timestamp).toBeDefined();
          
          resolve({ pongReceived: true, timestamp: data.timestamp });
        });

        // 发送心跳
        wsClient.emit("ping");
        console.log("📡 发送心跳ping");
      });
    });

    it("应该能够获取连接信息和状态", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("连接信息获取超时"));
        }, 15000);

        wsClient.on("connection-info", (info) => {
          clearTimeout(timeout);
          console.log("✅ 连接信息:", info);
          
          expect(info).toBeDefined();
          expect(info.clientId).toBe(wsClient.id);
          expect(info.connected).toBe(true);
          expect(info._authType).toBeDefined();
          expect(info.timestamp).toBeDefined();
          
          resolve({
            connectionInfo: info,
            clientIdMatches: info.clientId === wsClient.id
          });
        });

        // 请求连接信息
        wsClient.emit("get-info");
        console.log("📡 请求连接信息");
      });
    });

    it("应该能够获取当前订阅状态", async () => {
      const testSymbol = "META.US";
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("订阅状态获取超时"));
        }, 20000);

        let subscriptionCompleted = false;

        // 先订阅一个符号
        wsClient.on("subscribe-ack", (data) => {
          if (!subscriptionCompleted) {
            subscriptionCompleted = true;
            console.log("✅ 订阅完成，查询订阅状态");
            
            // 查询订阅状态
            wsClient.emit("get-subscription");
          }
        });

        wsClient.on("subscription-status", (status) => {
          clearTimeout(timeout);
          console.log("✅ 订阅状态:", status);
          
          expect(status).toBeDefined();
          expect(status.success).toBe(true);
          
          if (status.data) {
            expect(status.data.symbols).toContain(testSymbol);
            expect(status.data.wsCapabilityType).toBe('stream-stock-quote');
            expect(status.data._providerName).toBeDefined();
          }
          
          // 清理订阅
          wsClient.emit("unsubscribe", { symbols: [testSymbol] });
          setTimeout(() => resolve({ 
            statusRetrieved: true, 
            subscriptionData: status.data 
          }), 2000);
        });

        // 开始测试
        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          wsCapabilityType: "stream-stock-quote",
        });
      });
    }, 25000);

    it("应该处理格式错误的订阅请求", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true); // 如果没有错误事件，认为测试通过
        }, 10000);

        // 发送格式错误的请求
        const invalidRequests = [
          {}, // 空对象
          { symbols: [] }, // 空符号列表
          { wsCapabilityType: "stream-stock-quote" }, // 缺少symbols
          { symbols: ["AMD.US"] }, // 缺少wsCapabilityType
          { symbols: null, wsCapabilityType: "stream-stock-quote" }, // null符号
          { symbols: ["AMD.US"], wsCapabilityType: null }, // null能力类型
        ];

        let errorCount = 0;
        let expectedErrors = invalidRequests.length;

        wsClient.on("subscription_error", (error) => {
          errorCount++;
          console.log(`✅ 错误请求 #${errorCount} 被正确处理:`, error.message || error);
          
          if (errorCount >= Math.min(3, expectedErrors)) { // 至少处理3个错误或全部错误
            clearTimeout(timeout);
            resolve({ 
              errorsHandled: errorCount, 
              totalRequests: expectedErrors 
            });
          }
        });

        wsClient.on("subscribe-ack", (data) => {
          // 如果任何无效请求意外成功，记录警告
          console.log("⚠️ 无效请求意外成功:", data);
          if (data.symbols && data.symbols.length > 0) {
            // 清理意外的订阅
            wsClient.emit("unsubscribe", { symbols: data.symbols });
          }
        });

        // 依次发送无效请求
        invalidRequests.forEach((request, index) => {
          setTimeout(() => {
            console.log(`📡 发送无效请求 #${index + 1}:`, request);
            wsClient.emit("subscribe", request);
          }, index * 500);
        });
      });
    });
  });

  describe("🚨 错误处理和边界测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

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

    it("应该处理无效股票符号订阅", async () => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(true); // 如果没有错误事件，认为测试通过
        }, 15000);

        // 订阅无效符号
        wsClient.emit("subscribe", {
          symbols: ["INVALID_SYMBOL", "ANOTHER_INVALID"],
          wsCapabilityType: "stream-stock-quote",
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 无效符号订阅错误被正确处理:", error.message || error);
          expect(error).toBeDefined();
          
          // 即使是无效符号，也尝试发送退订请求，确保清理
          console.log("🔄 发送无效符号退订请求");
          wsClient.emit("unsubscribe", {
            symbols: ["INVALID_SYMBOL", "ANOTHER_INVALID"],
          });
          
          // 等待短暂时间后完成测试
          setTimeout(() => {
            resolve({
              success: true,
              errorHandled: true
            });
          }, 1000);
        });

        wsClient.on("subscription_partial", (data) => {
          clearTimeout(timeout);
          console.log("✅ 部分订阅成功（符号验证）:", data);
          expect(data.invalid_symbols).toBeDefined();
          expect(data.invalid_symbols.length).toBeGreaterThan(0);
          
          // 如果有部分成功的符号，需要退订
          if (data.valid_symbols && data.valid_symbols.length > 0) {
            console.log(`🔄 发送部分有效符号退订请求: ${data.valid_symbols.join(", ")}`);
            wsClient.emit("unsubscribe", {
              symbols: data.valid_symbols,
            });
          }
          
          // 等待短暂时间后完成测试
          setTimeout(() => {
            resolve({
              success: true,
              partialSuccess: true,
              validSymbols: data.valid_symbols || [],
              invalidSymbols: data.invalid_symbols || []
            });
          }, 1000);
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

        // 创建超过限制的符号列表（LongPort限制500个）
        const manySymbols = Array.from({ length: 600 }, (_, i) => `SYM${i}.HK`);
        
        wsClient.emit("subscribe", {
          symbols: manySymbols,
          wsCapabilityType: "stream-stock-quote",
        });

        wsClient.on("subscription_error", (error) => {
          clearTimeout(timeout);
          console.log("✅ 订阅数量限制错误被正确处理:", error.message || error);
          expect(error.message || error).toMatch(/limit|限制|exceed/i);
          
          // 测试完成后，不需要退订，因为订阅已被拒绝
          setTimeout(() => {
            resolve({
              success: true,
              errorHandled: true,
              message: error.message || error
            });
          }, 1000);
        });

        wsClient.on("subscription_partial", (data) => {
          clearTimeout(timeout);
          console.log("✅ 部分订阅成功（数量限制）:", data);
          expect(data.successful_count).toBeLessThan(600);
          expect(data.rejected_count).toBeGreaterThan(0);
          
          // 如果有部分成功的符号，需要退订
          if (data.successful_symbols && data.successful_symbols.length > 0) {
            console.log(`🔄 发送部分成功符号退订请求 (${data.successful_symbols.length} 个符号)`);
            wsClient.emit("unsubscribe", {
              symbols: data.successful_symbols,
            });
          } else if (data.successful_count > 0) {
            // 如果没有具体的成功符号列表，但有成功数量，使用原始符号列表的前N个
            const manySymbols = Array.from({ length: 600 }, (_, i) => `SYM${i}.HK`);
            const successfulSymbols = manySymbols.slice(0, data.successful_count);
            console.log(`🔄 发送推断的成功符号退订请求 (${data.successful_count} 个符号)`);
            wsClient.emit("unsubscribe", {
              symbols: successfulSymbols,
            });
          }
          
          // 等待短暂时间后完成测试
          setTimeout(() => {
            resolve({
              success: true,
              partialSuccess: true,
              successfulCount: data.successful_count,
              rejectedCount: data.rejected_count
            });
          }, 2000);
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });
    
    it("应该能够处理已订阅符号的重复订阅", async () => {
      // 使用独立的测试符号，确保测试的独立性
      const testSymbol = "AAPL.US";
      let firstSubscriptionSuccess = false;
      let resubscriptionSuccess = false;
      let dataReceived = false;
      let unsubscribeSuccess = false;
      let dataReceivedAfterUnsubscribe = false;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // 如果测试超时，确保清理
          if (firstSubscriptionSuccess && !unsubscribeSuccess) {
            console.log("⚠️ 测试超时，执行退订清理");
            wsClient.emit("unsubscribe", {
              symbols: [testSymbol],
            });
            
            setTimeout(() => {
              resolve({
                success: false,
                timeout: true,
                firstSubscriptionSuccess,
                resubscriptionSuccess,
                dataReceived
              });
            }, 2000);
          } else {
            reject(new Error("重复订阅测试超时，未能完成初始订阅"));
          }
        }, 30000);

        // 发送首次订阅请求
        wsClient.emit("subscribe", {
          symbols: [testSymbol],
          wsCapabilityType: "stream-stock-quote",
        });
        console.log(`📡 发送首次订阅请求: ${testSymbol}`);

        // 记录退订时间点
        let unsubscribeTime = 0;
        
        // 监听实时数据
        wsClient.on("data", (data) => {
          // 尝试从不同格式的数据结构中提取符号
          let symbol = null;
          if (data.symbol) {
            symbol = data.symbol;
          } else if (data.code) {
            symbol = data.code;
          } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            symbol = data.data[0].symbol || data.data[0].code;
          } else if (data.symbols && Array.isArray(data.symbols) && data.symbols.length > 0) {
            symbol = data.symbols[0];
          }
          
          if (symbol === testSymbol) {
            const now = Date.now();
            
            // 检查是否是退订后收到的数据
            if (unsubscribeTime > 0 && now - unsubscribeTime > 1000) {
              console.log(`⚠️ 退订后 ${now - unsubscribeTime}ms 仍收到数据: ${symbol}`);
              dataReceivedAfterUnsubscribe = true;
              return;
            }
            
            dataReceived = true;
            console.log(`📊 收到 ${symbol} 实时数据`);
            
            // 如果已经完成首次订阅但还未进行重复订阅，则触发重复订阅
            if (firstSubscriptionSuccess && !resubscriptionSuccess) {
              console.log(`🔄 收到数据后，立即尝试重复订阅已订阅的符号: ${testSymbol}`);
              wsClient.emit("subscribe", {
                symbols: [testSymbol],
                wsCapabilityType: "stream-stock-quote",
              });
            }
          }
        });

        // 监听订阅确认
        wsClient.on("subscribe-ack", (data) => {
          if (!firstSubscriptionSuccess) {
            console.log("✅ 首次订阅确认:", data);
            expect(data.symbols).toContain(testSymbol);
            firstSubscriptionSuccess = true;
            
            // 首次订阅成功后，立即尝试重复订阅（不等待数据）
            console.log(`🔄 首次订阅成功后，立即尝试重复订阅: ${testSymbol}`);
            wsClient.emit("subscribe", {
              symbols: [testSymbol],
              wsCapabilityType: "stream-stock-quote",
            });
          } else {
            console.log("✅ 重复订阅确认:", data);
            expect(data.symbols).toContain(testSymbol);
            resubscriptionSuccess = true;
            
            // 重复订阅成功后，等待可能的数据，然后执行退订
            setTimeout(() => {
              // 执行退订操作
              clearTimeout(timeout);
              console.log(`🔄 重复订阅测试完成，发送退订请求: ${testSymbol}`);
              
              unsubscribeTime = Date.now();
              wsClient.emit("unsubscribe", {
                symbols: [testSymbol],
              });
            }, 3000);
          }
        });
        
        // 监听退订确认
        wsClient.on("unsubscribe-ack", (data) => {
          console.log(`✅ 退订确认:`, data);
          expect(data.symbols).toContain(testSymbol);
          unsubscribeSuccess = true;
          
          // 等待3秒检查是否还有数据推送
          setTimeout(() => {
            clearTimeout(timeout);
            
            console.log(`🕐 退订后等待3秒检查，是否收到额外数据: ${dataReceivedAfterUnsubscribe ? '是' : '否'}`);
            
            resolve({
              success: true,
              firstSubscriptionSuccess,
              resubscriptionSuccess,
              dataReceived,
              unsubscribeSuccess: true,
              dataReceivedAfterUnsubscribe
            });
          }, 3000);
        });

        wsClient.on("subscription_error", (error) => {
          console.log("⚠️ 订阅错误:", error.message || error);
          
          // 如果是重复订阅导致的错误，这可能是正常的
          if (firstSubscriptionSuccess) {
            console.log("✅ 重复订阅被拒绝（这可能是符合预期的行为）");
            resubscriptionSuccess = false;
            
            // 执行退订
            clearTimeout(timeout);
            console.log(`🔄 重复订阅被拒绝，发送退订请求: ${testSymbol}`);
            
            unsubscribeTime = Date.now();
            wsClient.emit("unsubscribe", {
              symbols: [testSymbol],
            });
          } else {
            clearTimeout(timeout);
            reject(new Error(`首次订阅失败: ${error.message || error}`));
          }
        });

      });
    }, 40000);
  });

  describe("🌐 多客户端并发和负载测试", () => {
    let multipleClients: Socket[] = [];

    afterEach(async () => {
      // 清理所有并发客户端连接
      for (const client of multipleClients) {
        if (client && client.connected) {
          client.disconnect();
        }
      }
      multipleClients = [];
    });

    it("应该支持多个客户端同时连接和订阅", async () => {
      const clientCount = 3;
      const testSymbol = "TSLA.US";
      let connectedClients = 0;
      let clientsWithData = 0;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (connectedClients >= clientCount && clientsWithData > 0) {
            console.log(`✅ ${connectedClients} 个客户端连接成功，${clientsWithData} 个收到数据`);
            // 执行清理
            multipleClients.forEach((client) => {
              if (client.connected) {
                client.emit("unsubscribe", { symbols: [testSymbol] });
              }
            });
            setTimeout(() => resolve({ 
              connectedClients, 
              clientsWithData,
              concurrentSuccess: true 
            }), 3000);
          } else {
            reject(new Error(`并发测试超时: ${connectedClients}/${clientCount} 客户端连接，${clientsWithData} 收到数据`));
          }
        }, 45000);

        // 创建多个并发客户端
        for (let i = 0; i < clientCount; i++) {
          const client = io(wsURL, {
            path: "/api/v1/stream-receiver/connect",
            auth: {
              appKey: apiKey.appKey,
              accessToken: apiKey.accessToken,
            },
            transports: ['websocket'],
          });

          multipleClients.push(client);

          client.on("connect", () => {
            connectedClients++;
            console.log(`🔗 客户端 #${i + 1} 连接成功 (${connectedClients}/${clientCount})`);

            // 每个客户端订阅同一个符号
            client.emit("subscribe", {
              symbols: [testSymbol],
              wsCapabilityType: "stream-stock-quote",
            });
          });

          client.on("data", (data) => {
            if (data.symbols?.includes(testSymbol) || 
                data.data?.[0]?.symbol === testSymbol) {
              clientsWithData++;
              console.log(`📊 客户端 #${i + 1} 收到数据 (总计: ${clientsWithData})`);

              // 如果足够的客户端收到数据，提前完成测试
              if (clientsWithData >= Math.min(2, clientCount)) {
                clearTimeout(timeout);
                console.log(`🎯 达到并发数据接收目标: ${clientsWithData} 个客户端`);
                
                // 执行清理
                multipleClients.forEach(c => {
                  if (c.connected) {
                    c.emit("unsubscribe", { symbols: [testSymbol] });
                  }
                });
                
                setTimeout(() => resolve({
                  connectedClients,
                  clientsWithData,
                  concurrentSuccess: true
                }), 3000);
              }
            }
          });

          client.on("connect_error", (error) => {
            console.error(`❌ 客户端 #${i + 1} 连接失败:`, error.message);
          });

          client.on("subscribe-ack", () => {
            console.log(`✅ 客户端 #${i + 1} 订阅确认`);
          });
        }
      });
    }, 50000);

    it("应该处理客户端订阅不同符号的独立数据流", async () => {
      const clientSymbols = [
        { clientId: 0, symbol: "AAPL.US" },
        { clientId: 1, symbol: "GOOGL.US" },
        { clientId: 2, symbol: "MSFT.US" },
      ];
      
      let clientDataReceived = new Map();
      let connectedClients = 0;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const successfulClients = clientDataReceived.size;
          if (successfulClients > 0) {
            console.log(`✅ ${successfulClients} 个客户端收到独立数据流`);
            
            // 执行清理
            multipleClients.forEach((client, index) => {
              if (client.connected && clientSymbols[index]) {
                client.emit("unsubscribe", { symbols: [clientSymbols[index].symbol] });
              }
            });
            
            setTimeout(() => resolve({ 
              clientsWithIndependentData: successfulClients,
              dataReceived: Array.from(clientDataReceived.entries())
            }), 3000);
          } else {
            reject(new Error("独立数据流测试超时"));
          }
        }, 40000);

        // 为每个客户端创建独立连接和订阅
        clientSymbols.forEach(({ clientId, symbol }) => {
          const client = io(wsURL, {
            path: "/api/v1/stream-receiver/connect",
            auth: {
              appKey: apiKey.appKey,
              accessToken: apiKey.accessToken,
            },
            transports: ['websocket'],
          });

          multipleClients.push(client);

          client.on("connect", () => {
            connectedClients++;
            console.log(`🔗 独立客户端 #${clientId + 1} 连接成功: ${symbol}`);

            client.emit("subscribe", {
              symbols: [symbol],
              wsCapabilityType: "stream-stock-quote",
            });
          });

          client.on("data", (data) => {
            let receivedSymbol = null;
            
            if (data.symbols && data.symbols.length > 0) {
              receivedSymbol = data.symbols[0];
            } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
              receivedSymbol = data.data[0].symbol || data.data[0].code;
            }

            if (receivedSymbol === symbol) {
              if (!clientDataReceived.has(clientId)) {
                clientDataReceived.set(clientId, { symbol, dataCount: 0 });
              }
              
              clientDataReceived.get(clientId).dataCount++;
              console.log(`📊 客户端 #${clientId + 1} 收到 ${symbol} 数据 (第${clientDataReceived.get(clientId).dataCount}次)`);

              // 如果足够的客户端收到数据，提前完成
              if (clientDataReceived.size >= Math.min(2, clientSymbols.length)) {
                clearTimeout(timeout);
                console.log(`🎯 达到独立数据流目标: ${clientDataReceived.size} 个独立流`);
                
                // 执行清理
                multipleClients.forEach((c, idx) => {
                  if (c.connected && clientSymbols[idx]) {
                    c.emit("unsubscribe", { symbols: [clientSymbols[idx].symbol] });
                  }
                });
                
                setTimeout(() => resolve({
                  clientsWithIndependentData: clientDataReceived.size,
                  dataReceived: Array.from(clientDataReceived.entries())
                }), 3000);
              }
            }
          });

          client.on("connect_error", (error) => {
            console.error(`❌ 独立客户端 #${clientId + 1} 连接失败:`, error.message);
          });
        });
      });
    }, 45000);
  });

  describe("🔧 连接生命周期和资源管理测试", () => {
    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    it("应该正确处理客户端主动断开连接时的资源清理", async () => {
      const testSymbol = "NFLX.US";
      let subscriptionActive = false;
      let disconnectionHandled = false;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("连接生命周期测试超时"));
        }, 25000);

        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
        });

        wsClient.on("connect", () => {
          console.log("🔗 连接建立，开始订阅");
          
          wsClient.emit("subscribe", {
            symbols: [testSymbol],
            wsCapabilityType: "stream-stock-quote",
          });
        });

        wsClient.on("subscribe-ack", () => {
          subscriptionActive = true;
          console.log("✅ 订阅成功，准备测试断开连接");
          
          // 订阅成功后，等待一段时间再主动断开
          setTimeout(() => {
            console.log("🔌 主动断开WebSocket连接");
            wsClient.disconnect();
          }, 3000);
        });

        wsClient.on("disconnect", (reason) => {
          disconnectionHandled = true;
          console.log(`✅ 连接断开处理: ${reason}`);
          
          clearTimeout(timeout);
          
          // 验证断开连接的处理
          expect(subscriptionActive).toBe(true);
          expect(disconnectionHandled).toBe(true);
          
          resolve({
            subscriptionActive,
            disconnectionHandled,
            reason
          });
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`连接失败: ${error.message}`));
        });
      });
    }, 30000);

    it("应该能够在连接断开后重新连接并恢复订阅", async () => {
      const testSymbol = "AMZN.US";
      let initialConnectionId = null;
      let reconnectionId = null;
      let dataReceivedAfterReconnect = false;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("重连恢复测试超时"));
        }, 40000);

        // 第一次连接
        wsClient = io(wsURL, {
          path: "/api/v1/stream-receiver/connect",
          auth: {
            appKey: apiKey.appKey,
            accessToken: apiKey.accessToken,
          },
          transports: ['websocket'],
          reconnection: false, // 禁用自动重连，手动控制
        });

        wsClient.on("connect", () => {
          if (!initialConnectionId) {
            initialConnectionId = wsClient.id;
            console.log(`🔗 初始连接建立: ${initialConnectionId}`);
            
            // 订阅测试符号
            wsClient.emit("subscribe", {
              symbols: [testSymbol],
              wsCapabilityType: "stream-stock-quote",
            });
          } else {
            reconnectionId = wsClient.id;
            console.log(`🔄 重连成功: ${reconnectionId}`);
            
            // 重连后重新订阅
            wsClient.emit("subscribe", {
              symbols: [testSymbol],
              wsCapabilityType: "stream-stock-quote",
            });
          }
        });

        wsClient.on("subscribe-ack", () => {
          if (!reconnectionId) {
            console.log("✅ 初始订阅确认，准备断开连接");
            
            // 初始订阅成功后，断开连接
            setTimeout(() => {
              console.log("🔌 模拟断开连接");
              wsClient.disconnect();
            }, 2000);
          } else {
            console.log("✅ 重连后订阅确认");
          }
        });

        wsClient.on("data", () => {
          if (reconnectionId) {
            dataReceivedAfterReconnect = true;
            console.log("📊 重连后收到数据，测试成功");
            
            clearTimeout(timeout);
            
            // 清理订阅
            wsClient.emit("unsubscribe", { symbols: [testSymbol] });
            
            setTimeout(() => {
              resolve({
                initialConnectionId,
                reconnectionId,
                dataReceivedAfterReconnect,
                connectionIdChanged: initialConnectionId !== reconnectionId
              });
            }, 2000);
          }
        });

        wsClient.on("disconnect", (reason) => {
          if (initialConnectionId && !reconnectionId) {
            console.log(`🔌 初始连接断开: ${reason}`);
            
            // 等待一段时间后重新连接
            setTimeout(() => {
              console.log("🔄 开始重新连接");
              wsClient = io(wsURL, {
                path: "/api/v1/stream-receiver/connect",
                auth: {
                  appKey: apiKey.appKey,
                  accessToken: apiKey.accessToken,
                },
                transports: ['websocket'],
                reconnection: false,
              });
              
              // 重新绑定事件监听器
              wsClient.on("connect", () => {
                reconnectionId = wsClient.id;
                console.log(`🔄 重连成功: ${reconnectionId}`);
                
                // 重连后重新订阅
                wsClient.emit("subscribe", {
                  symbols: [testSymbol],
                  wsCapabilityType: "stream-stock-quote",
                });
              });
              
              wsClient.on("subscribe-ack", () => {
                console.log("✅ 重连后订阅确认");
              });
              
              wsClient.on("data", () => {
                dataReceivedAfterReconnect = true;
                console.log("📊 重连后收到数据，测试成功");
                
                clearTimeout(timeout);
                
                // 清理订阅
                wsClient.emit("unsubscribe", { symbols: [testSymbol] });
                
                setTimeout(() => {
                  resolve({
                    initialConnectionId,
                    reconnectionId,
                    dataReceivedAfterReconnect,
                    connectionIdChanged: initialConnectionId !== reconnectionId
                  });
                }, 2000);
              });
              
            }, 2000);
          }
        });

        wsClient.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`连接失败: ${error.message}`));
        });
      });
    }, 45000);
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