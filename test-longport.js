const { Config, QuoteContext, SubType } = require("longport");

console.log("检查 LongPort 库版本和 API...");
console.log("LongPort 版本:", require("longport/package.json").version);

console.log("\n可用方法:");
console.log(Object.getOwnPropertyNames(QuoteContext.prototype));

console.log("\n尝试创建 QuoteContext...");
const config = Config.fromEnv();
QuoteContext.new(config).then(ctx => {
  console.log("\nQuoteContext 实例方法:");
  console.log(Object.getOwnPropertyNames(ctx.__proto__));
  
  console.log("\n检查实例是否有 setOnConnected 方法:");
  console.log("setOnConnected 存在:", typeof ctx.setOnConnected === 'function');
  
  console.log("\n检查替代方法 (事件监听):");
  console.log("setOnQuote 存在:", typeof ctx.setOnQuote === 'function');
  
  if (typeof ctx.on === 'function') {
    console.log("on 方法存在 (事件监听器)");
  }
  
  // 检查可能的替代方案
  const possibleMethods = [
    'on', 'addEventListener', 'addListener', 'onConnected', 
    'onDisconnected', 'onConnect', 'onDisconnect'
  ];
  
  console.log("\n可能的替代连接事件方法:");
  for (const method of possibleMethods) {
    console.log(`${method} 存在:`, typeof ctx[method] === 'function');
  }
  
  console.log("\n检查对象完整结构:");
  console.log(Object.keys(ctx));
}).catch(err => {
  console.error("创建 QuoteContext 失败:", err);
});
