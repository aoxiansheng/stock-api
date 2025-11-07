export interface ProviderConfig {
  // 极简配置占位，具体实现由各 Provider 自行定义
  [key: string]: any;
}

export interface ProviderCredentials {
  // 极简凭证占位，建议从环境变量或安全存储加载
  [key: string]: any;
}

