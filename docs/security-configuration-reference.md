# 🔒 安全配置快速参考

## 📋 概述

本文档提供智能股票数据系统的安全配置快速参考，包括环境变量、认证配置、安全中间件和最佳实践。适用于系统管理员和DevOps工程师。

## 🔧 环境变量配置

### 核心安全配置

```bash
# JWT配置
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 数据库安全
MONGODB_URI=mongodb://username:password@localhost:27017/stockdata
MONGODB_SSL=true
MONGODB_AUTH_SOURCE=admin

# Redis安全
REDIS_PASSWORD=your_redis_password
REDIS_TLS=true
REDIS_AUTH_ACL=true

# API安全
API_RATE_LIMIT_WINDOW=15m
API_RATE_LIMIT_MAX=100
API_CORS_ORIGIN=https://yourdomain.com
API_HELMET_ENABLED=true

# 加密配置
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=your_32_char_encryption_key
SALT_ROUNDS=12

# 监控和日志
SECURITY_LOG_LEVEL=info
AUDIT_LOG_ENABLED=true
PERFORMANCE_MONITORING=true
```

### 生产环境安全配置

```bash
# 安全强化
NODE_ENV=production
DISABLE_X_POWERED_BY=true
FORCE_HTTPS=true
SECURE_COOKIES=true
SAME_SITE=strict

# 安全扫描
VULNERABILITY_SCAN_ENABLED=true
DEPENDENCY_CHECK_ENABLED=true
SECURITY_ALERTS_EMAIL=security@company.com

# 访问控制
IP_WHITELIST=192.168.1.0/24,10.0.0.0/8
GEO_BLOCKING_ENABLED=true
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30m
```

## 🔐 认证系统配置

### JWT配置

```typescript
// src/auth/auth.module.ts
JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'stock-api',
    audience: 'stock-api-client'
  }
})
```

### API Key安全配置

```typescript
// API Key生成配置
const apiKeyConfig = {
  keyLength: 32,           // API Key长度
  tokenLength: 64,         // Access Token长度
  hashAlgorithm: 'sha256', // 哈希算法
  saltRounds: 12,          // 盐轮数
  expirationDays: 365      // 过期天数
}
```

### 频率限制配置

```typescript
// 默认频率限制配置
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,  // 15分钟窗口
  max: 100,                   // 最大请求数
  standardHeaders: true,      // 标准响应头
  legacyHeaders: false,       // 禁用legacy头
  store: 'redis',            // 使用Redis存储
  skipSuccessfulRequests: false,
  skipFailedRequests: false
}
```

## 🛡️ 安全中间件配置

### Helmet安全头配置

```typescript
// src/main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}))
```

### CORS配置

```typescript
// CORS安全配置
app.enableCors({
  origin: process.env.API_CORS_ORIGIN?.split(',') || false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-App-Key',
    'X-Access-Token',
    'X-Requested-With'
  ],
  credentials: true,
  maxAge: 86400 // 24小时预检缓存
})
```

### 输入验证配置

```typescript
// 全局验证管道
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // 只允许已知属性
    forbidNonWhitelisted: true,   // 拒绝未知属性
    transform: true,              // 自动类型转换
    disableErrorMessages: process.env.NODE_ENV === 'production',
    validationError: {
      target: false,              // 不返回目标对象
      value: false               // 不返回原始值
    }
  })
)
```

## 🔍 安全监控配置

### 安全扫描配置

```typescript
// src/security/security-scanner.service.ts
const scannerConfig = {
  enabled: process.env.VULNERABILITY_SCAN_ENABLED === 'true',
  interval: '0 2 * * *',  // 每日凌晨2点扫描
  checks: [
    'dependency-vulnerabilities',
    'weak-passwords',
    'exposed-secrets',
    'insecure-configurations',
    'ssl-certificates',
    'database-security',
    'api-security',
    'authentication-bypass',
    'privilege-escalation',
    'data-exposure'
  ],
  riskThreshold: 'medium',
  alertEmail: process.env.SECURITY_ALERTS_EMAIL
}
```

### 审计日志配置

```typescript
// 安全审计配置
const auditConfig = {
  logLevel: process.env.SECURITY_LOG_LEVEL || 'info',
  retentionDays: 90,
  events: [
    'user-login',
    'user-logout',
    'api-key-created',
    'api-key-revoked',
    'failed-authentication',
    'permission-denied',
    'data-access',
    'configuration-change',
    'security-incident'
  ],
  storage: 'mongodb',
  encryption: true
}
```

## 🚨 安全告警配置

### 告警规则

```typescript
// 默认安全告警规则
const securityAlerts = [
  {
    name: '多次登录失败',
    condition: 'failed_logins > 5 in 10m',
    severity: 'high',
    action: 'block_ip'
  },
  {
    name: 'API Key滥用',
    condition: 'api_requests > 1000 in 1m',
    severity: 'medium',
    action: 'rate_limit'
  },
  {
    name: '异常数据访问',
    condition: 'data_volume > 10GB in 1h',
    severity: 'high',
    action: 'alert_admin'
  },
  {
    name: '可疑IP活动',
    condition: 'requests_from_new_ip > 100 in 5m',
    severity: 'medium',
    action: 'require_verification'
  }
]
```

### 通知配置

```bash
# 告警通知配置
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_SMTP_HOST=smtp.company.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_USERNAME=alerts@company.com
ALERT_EMAIL_PASSWORD=smtp_password
ALERT_EMAIL_TO=security@company.com,admin@company.com

# 钉钉机器人通知
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
DINGTALK_SECRET=dingtalk_secret

# 短信告警
SMS_ENABLED=true
SMS_PROVIDER=aliyun
SMS_ACCESS_KEY=your_sms_access_key
SMS_SECRET_KEY=your_sms_secret_key
```

## 🗄️ 数据库安全配置

### MongoDB安全配置

```javascript
// MongoDB连接安全配置
{
  uri: process.env.MONGODB_URI,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: process.env.MONGODB_SSL === 'true',
  sslValidate: true,
  sslCA: fs.readFileSync('/path/to/ca-certificate.crt'),
  authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
  retryWrites: true,
  w: 'majority',
  readPreference: 'primary',
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  keepAlive: true,
  keepAliveInitialDelay: 300000
}
```

### Redis安全配置

```bash
# Redis配置文件
requirepass your_redis_password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG "CONFIG_abc123"
maxmemory-policy allkeys-lru
timeout 300
tcp-keepalive 300
```

## 🔐 SSL/TLS配置

### HTTPS配置

```typescript
// 生产环境HTTPS配置
const httpsOptions = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ca: fs.readFileSync('/path/to/ca-certificate.pem'),
  secureProtocol: 'TLSv1_2_method',
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
  ].join(':'),
  honorCipherOrder: true
}
```

### 证书管理

```bash
# 自动证书更新 (Let's Encrypt)
#!/bin/bash
certbot renew --quiet --no-self-upgrade
systemctl reload nginx
```

## 🐳 Docker安全配置

### 安全Dockerfile

```dockerfile
# 多阶段构建安全配置
FROM node:18-alpine AS builder
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# 运行时安全配置
FROM alpine:3.18
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs
ENTRYPOINT ["dumb-init", "--"]
```

### Docker运行安全

```bash
# 安全运行容器
docker run -d \
  --name stock-api \
  --user 1001:1001 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  -p 3000:3000 \
  stock-api:latest
```

## 🔧 部署安全配置

### Nginx反向代理配置

```nginx
server {
    listen 443 ssl http2;
    server_name api.stockdata.com;
    
    # SSL配置
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # 安全头部
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # 频率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📋 安全检查清单

### 部署前检查

- [ ] 所有默认密码已更改
- [ ] SSL/TLS证书已配置并有效
- [ ] 防火墙规则已正确配置
- [ ] 不必要的服务和端口已关闭
- [ ] 系统和依赖项已更新到最新版本
- [ ] 安全头部已正确配置
- [ ] 输入验证和输出编码已实施
- [ ] 错误处理不泄露敏感信息
- [ ] 日志记录已配置但不记录敏感数据
- [ ] 备份策略已实施并测试

### 运行时监控

- [ ] 安全扫描定期执行
- [ ] 审计日志正常记录
- [ ] 告警系统正常工作
- [ ] 性能监控检测异常活动
- [ ] 访问控制正常工作
- [ ] 证书有效期监控
- [ ] 数据库连接安全
- [ ] API频率限制生效

### 应急响应

- [ ] 安全事件响应计划已制定
- [ ] 联系人信息已更新
- [ ] 应急响应团队已培训
- [ ] 恢复程序已测试
- [ ] 通信渠道已建立
- [ ] 法务和合规流程已了解

## 🚨 常见安全问题解决

### 认证问题

```bash
# 重置JWT密钥
kubectl create secret generic jwt-secret \
  --from-literal=JWT_SECRET=$(openssl rand -base64 32)

# 撤销所有API Key
npm run script:revoke-all-keys

# 重置管理员密码
npm run script:reset-admin-password
```

### 数据库安全

```bash
# 检查MongoDB安全配置
mongo --eval "db.adminCommand('getCmdLineOpts')"

# 创建只读用户
mongo admin --eval "
  db.createUser({
    user: 'readonly',
    pwd: 'secure_password',
    roles: [ { role: 'read', db: 'stockdata' } ]
  })
"
```

### 网络安全

```bash
# 检查开放端口
nmap -sS -O target_server

# 监控网络连接
netstat -tulpn | grep LISTEN

# 检查防火墙规则
iptables -L -n -v
```

## 📞 安全支持

如遇安全问题，请立即联系：

- **安全团队邮箱**: security@company.com
- **安全热线**: +86-xxx-xxxx-xxxx
- **应急响应**: 24/7 on-call
- **漏洞报告**: 通过加密邮件或安全平台

---

*本文档最后更新于: 2025年1月*
*下次安全审查: 2025年4月*