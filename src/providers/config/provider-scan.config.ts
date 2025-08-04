/**
 * 提供商扫描统一配置
 * 
 * 遵循"一地配置，多处使用"原则
 * 所有提供商扫描相关的配置都在这里统一管理
 */

/**
 * 提供商扫描配置接口
 */
export interface ProviderScanConfig {
  /** 需要排除的系统目录 */
  excludedDirs: string[];
  /** 支持的文件扩展名 */
  supportedExtensions: string[];
  /** 提供商主文件可能的名称模式 */
  mainFilePatterns: string[];
  /** 能力文件目录名称 */
  capabilitiesDir: string;
  /** 是否启用约定验证 */
  validateConventions: boolean;
}

/**
 * 默认提供商扫描配置
 * 
 * 🎯 核心配置项说明：
 * 
 * excludedDirs - 需要排除的系统目录：
 * - node_modules: npm包目录
 * - interfaces: 接口定义目录
 * - services: 服务目录 
 * - controller: 控制器目录
 * - module: 模块目录
 * - utils: 工具函数目录
 * - decorators: 装饰器目录
 * - cli: CLI工具目录
 * - config: 配置目录
 */
export const DEFAULT_PROVIDER_SCAN_CONFIG: ProviderScanConfig = {
  excludedDirs: [
    'node_modules',
    'interfaces', 
    'services',
    'controller',
    'module',
    'utils',
    'decorators',
    'cli',
    'config'  // 新增配置目录排除
  ],
  
  supportedExtensions: ['.ts', '.js'],
  
  mainFilePatterns: [
    'index.ts',
    '{provider}.provider.ts',
    'provider.ts'
  ],
  
  capabilitiesDir: 'capabilities',
  
  validateConventions: true
};

/**
 * 获取提供商扫描配置
 * 支持环境变量覆盖
 */
export function getProviderScanConfig(): ProviderScanConfig {
  const config = { ...DEFAULT_PROVIDER_SCAN_CONFIG };
  
  // 支持通过环境变量添加额外的排除目录
  const extraExcludeDirs = process.env.PROVIDER_SCAN_EXCLUDE_DIRS;
  if (extraExcludeDirs) {
    const extraDirs = extraExcludeDirs.split(',').map(dir => dir.trim());
    config.excludedDirs.push(...extraDirs);
  }
  
  // 支持通过环境变量禁用约定验证
  if (process.env.PROVIDER_SCAN_DISABLE_CONVENTIONS === 'true') {
    config.validateConventions = false;
  }
  
  return config;
}

/**
 * 检查目录是否应该被排除
 */
export function shouldExcludeDirectory(dirName: string, config?: ProviderScanConfig): boolean {
  const scanConfig = config || getProviderScanConfig();
  return scanConfig.excludedDirs.includes(dirName) || dirName.startsWith('.');
}

/**
 * 检查文件扩展名是否支持
 */
export function isSupportedExtension(filename: string, config?: ProviderScanConfig): boolean {
  const scanConfig = config || getProviderScanConfig();
  return scanConfig.supportedExtensions.some(ext => filename.endsWith(ext));
}

/**
 * 生成提供商主文件的可能路径
 */
export function generateMainFilePaths(providerName: string, providerPath: string, config?: ProviderScanConfig): string[] {
  const scanConfig = config || getProviderScanConfig();
  
  return scanConfig.mainFilePatterns.map(pattern => {
    const filename = pattern.replace('{provider}', providerName);
    return `${providerPath}/${filename}`;
  });
}