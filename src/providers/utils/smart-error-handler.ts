import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { createLogger } from '@common/config/logger.config';
import { SmartPathResolver } from './smart-path-resolver';
import { ConventionViolation } from '../decorators/metadata.types';

export interface AutoFixResult {
  success: boolean;
  fixedIssues: string[];
  remainingIssues: string[];
  generatedFiles: string[];
}

export interface ErrorAnalysis {
  errorType: 'missing_file' | 'missing_directory' | 'import_error' | 'interface_error' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  suggestions: string[];
  fixes: AutoFix[];
}

export interface AutoFix {
  type: 'create_file' | 'create_directory' | 'update_file' | 'install_dependency';
  description: string;
  action: () => Promise<void>;
}

/**
 * 智能错误处理和自动修复器
 */
export class SmartErrorHandler {
  private static readonly logger = createLogger('SmartErrorHandler');

  /**
   * 分析提供商加载错误并提供修复建议
   */
  static analyzeProviderError(providerName: string, error: Error): ErrorAnalysis {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('cannot find module')) {
      return this.handleModuleNotFoundError(providerName);
    }
    
    if (errorMessage.includes('does not implement') || errorMessage.includes('interface')) {
      return this.handleInterfaceError(providerName);
    }
    
    if (errorMessage.includes('缺少') && errorMessage.includes('目录')) {
      return this.handleMissingDirectoryError(providerName);
    }
    
    return this.handleUnknownError(providerName);
  }

  /**
   * 自动修复提供商问题
   */
  static async autoFixProvider(providerName: string, analysis: ErrorAnalysis): Promise<AutoFixResult> {
    const result: AutoFixResult = {
      success: false,
      fixedIssues: [],
      remainingIssues: [],
      generatedFiles: []
    };

    if (!analysis.autoFixable) {
      result.remainingIssues.push('错误不可自动修复');
      return result;
    }

    try {
      for (const fix of analysis.fixes) {
        try {
          await fix.action();
          result.fixedIssues.push(fix.description);
          this.logger.log(`自动修复完成: ${fix.description}`);
        } catch (fixError) {
          const errorMsg = `修复失败 - ${fix.description}: ${fixError.message}`;
          result.remainingIssues.push(errorMsg);
          this.logger.warn(errorMsg);
        }
      }

      result.success = result.remainingIssues.length === 0;
      return result;
    } catch (error) {
      result.remainingIssues.push(`自动修复过程失败: ${error.message}`);
      return result;
    }
  }

  /**
   * 批量修复约定违规
   */
  static async autoFixViolations(violations: ConventionViolation[]): Promise<AutoFixResult> {
    const result: AutoFixResult = {
      success: false,
      fixedIssues: [],
      remainingIssues: [],
      generatedFiles: []
    };

    const autoFixableViolations = violations.filter(v => v.autoFixable);
    
    for (const violation of autoFixableViolations) {
      try {
        await this.fixViolation(violation);
        result.fixedIssues.push(`修复约定违规: ${violation.message}`);
      } catch (error) {
        result.remainingIssues.push(`修复失败: ${violation.message} - ${error.message}`);
      }
    }

    // 处理不可自动修复的违规
    const nonFixableViolations = violations.filter(v => !v.autoFixable);
    result.remainingIssues.push(...nonFixableViolations.map(v => v.message));

    result.success = result.remainingIssues.length === 0;
    return result;
  }

  /**
   * 生成提供商模板
   */
  static async generateProviderTemplate(
    providerName: string,
    options: {
      capabilities?: string[];
      withTests?: boolean;
      withDocs?: boolean;
      description?: string;
    } = {}
  ): Promise<string[]> {
    const generatedFiles: string[] = [];
    const {
      capabilities = ['get-stock-quote'],
      withTests = false,
      withDocs = true,
      description = `${providerName} 数据源`
    } = options;

    try {
      // 创建提供商目录
      const providerPath = SmartPathResolver.getProviderPath(providerName);
      await mkdir(providerPath, { recursive: true });

      // 生成主提供商文件
      const mainFile = await this.generateProviderMainFile(providerName, description);
      const mainFilePath = join(providerPath, 'index.ts');
      await writeFile(mainFilePath, mainFile);
      generatedFiles.push(mainFilePath);

      // 生成NestJS模块文件
      const moduleFile = await this.generateProviderModule(providerName);
      const moduleDir = join(providerPath, 'module');
      await mkdir(moduleDir, { recursive: true });
      const moduleFilePath = join(moduleDir, `${providerName}.module.ts`);
      await writeFile(moduleFilePath, moduleFile);
      generatedFiles.push(moduleFilePath);

      // 创建能力目录和文件
      const capabilitiesPath = join(providerPath, 'capabilities');
      await mkdir(capabilitiesPath, { recursive: true });

      for (const capability of capabilities) {
        const capabilityFile = await this.generateCapabilityFile(providerName, capability);
        const capabilityFilePath = join(capabilitiesPath, `${capability}.ts`);
        await writeFile(capabilityFilePath, capabilityFile);
        generatedFiles.push(capabilityFilePath);
      }

      // 生成类型定义文件
      const typesFile = await this.generateTypesFile(providerName);
      const typesFilePath = join(providerPath, 'types.ts');
      await writeFile(typesFilePath, typesFile);
      generatedFiles.push(typesFilePath);

      // 生成文档
      if (withDocs) {
        const readmeFile = await this.generateReadmeFile(providerName, capabilities, description);
        const readmeFilePath = join(providerPath, 'README.md');
        await writeFile(readmeFilePath, readmeFile);
        generatedFiles.push(readmeFilePath);
      }

      // 生成测试文件
      if (withTests) {
        const testFiles = await this.generateTestFiles(providerName);
        for (const [fileName, content] of Object.entries(testFiles)) {
          const testFilePath = join(providerPath, fileName);
          await mkdir(dirname(testFilePath), { recursive: true });
          await writeFile(testFilePath, content);
          generatedFiles.push(testFilePath);
        }
      }

      this.logger.log(`提供商模板生成成功: ${providerName}, 生成了 ${generatedFiles.length} 个文件`);
      return generatedFiles;
    } catch (error) {
      this.logger.error(`生成提供商模板失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 处理模块未找到错误
   */
  private static handleModuleNotFoundError(providerName: string): ErrorAnalysis {
    const suggestions = [
      `确保 ${providerName} 目录存在`,
      `创建主文件: index.ts 或 ${providerName}.provider.ts`,
      `实现 IDataProvider 接口`,
      `添加必要的导出`
    ];

    const fixes: AutoFix[] = [
      {
        type: 'create_directory',
        description: `创建提供商目录 ${providerName}`,
        action: async () => {
          const providerPath = SmartPathResolver.getProviderPath(providerName);
          await mkdir(providerPath, { recursive: true });
        }
      },
      {
        type: 'create_file',
        description: `生成提供商模板文件`,
        action: async () => {
          await this.generateProviderTemplate(providerName);
        }
      }
    ];

    return {
      errorType: 'missing_file',
      severity: 'high',
      autoFixable: true,
      suggestions,
      fixes
    };
  }

  /**
   * 处理接口实现错误
   */
  private static handleInterfaceError(providerName: string): ErrorAnalysis {
    const suggestions = [
      `确保提供商 ${providerName} 类实现了 IDataProvider 接口`,
      '检查所有必需方法是否已实现',
      '验证方法签名是否正确',
      '参考现有提供商实现'
    ];

    return {
      errorType: 'interface_error',
      severity: 'high',
      autoFixable: false,
      suggestions,
      fixes: []
    };
  }

  /**
   * 处理缺少目录错误
   */
  private static handleMissingDirectoryError(providerName: string): ErrorAnalysis {
    const suggestions = [
      `创建 capabilities 目录`,
      `添加至少一个能力文件`,
      `确保目录结构符合约定`
    ];

    const fixes: AutoFix[] = [
      {
        type: 'create_directory',
        description: `创建 capabilities 目录`,
        action: async () => {
          const capabilitiesPath = SmartPathResolver.getProviderCapabilitiesPath(providerName);
          await mkdir(capabilitiesPath, { recursive: true });
        }
      },
      {
        type: 'create_file',
        description: `生成示例能力文件`,
        action: async () => {
          const capabilitiesPath = SmartPathResolver.getProviderCapabilitiesPath(providerName);
          const capabilityFile = await this.generateCapabilityFile(providerName, 'get-stock-quote');
          await writeFile(join(capabilitiesPath, 'get-stock-quote.ts'), capabilityFile);
        }
      }
    ];

    return {
      errorType: 'missing_directory',
      severity: 'medium',
      autoFixable: true,
      suggestions,
      fixes
    };
  }

  /**
   * 处理未知错误
   */
  private static handleUnknownError(providerName: string): ErrorAnalysis {
    const suggestions = [
      `检查提供商 ${providerName} 的错误日志了解详细信息`,
      `验证提供商 ${providerName} 结构完整性`,
      '确保所有依赖已正确安装',
      '参考文档或联系技术支持'
    ];

    return {
      errorType: 'unknown',
      severity: 'medium',
      autoFixable: false,
      suggestions,
      fixes: []
    };
  }

  /**
   * 修复单个约定违规
   */
  private static async fixViolation(violation: ConventionViolation): Promise<void> {
    switch (violation.type) {
      case 'missing_directory':
        await mkdir(violation.path, { recursive: true });
        break;
      case 'missing_file':
        // 根据路径推断需要创建的文件类型
        if (violation.path.includes('capabilities')) {
          // 创建示例能力文件
          const content = '// TODO: 实现能力逻辑\n';
          await writeFile(violation.path, content);
        }
        break;
      default:
        throw new Error(`不支持的自动修复类型: ${violation.type}`);
    }
  }

  // 以下是模板生成方法
  private static async generateProviderMainFile(providerName: string, description: string): Promise<string> {
    const className = this.toPascalCase(providerName) + 'Provider';
    
    return `import { Injectable } from '@nestjs/common';
import { Provider } from '../../decorators';
import { IDataProvider } from '../../interfaces/provider.interface';

@Provider({
  name: '${providerName}',
  description: '${description}',
  autoRegister: true,
  healthCheck: true
})
@Injectable()
export class ${className} implements IDataProvider {
  readonly name = '${providerName}';
  readonly description = '${description}';

  async initialize(): Promise<void> {
    // TODO: 实现初始化逻辑
    console.log(\`\${this.name} 数据源初始化完成\`);
  }

  async testConnection(): Promise<boolean> {
    // TODO: 实现连接测试
    return true;
  }

  getCapability(name: string): any {
    // TODO: 实现能力获取逻辑
    return null;
  }
}

export default ${className};
`;
  }

  private static async generateProviderModule(providerName: string): Promise<string> {
    const className = this.toPascalCase(providerName) + 'Provider';
    const moduleName = this.toPascalCase(providerName) + 'Module';
    
    return `import { Module } from '@nestjs/common';
import { ${className} } from '../index';

@Module({
  providers: [${className}],
  exports: [${className}]
})
export class ${moduleName} {}
`;
  }

  private static async generateCapabilityFile(providerName: string, capabilityName: string): Promise<string> {
    const className = this.toPascalCase(capabilityName.replace(/-/g, ' ')) + 'Capability';
    
    return `import { Capability } from '../../../decorators';
import { ICapability } from '../../../interfaces/capability.interface';
import { DataRequest, DataResponse } from '../../../interfaces/data.interface';

@Capability({
  name: '${capabilityName}',
  provider: '${providerName}',
  description: '${capabilityName} 能力实现',
  markets: ['US', 'HK'], // TODO: 配置支持的市场
  priority: 1
})
export class ${className} implements ICapability {
  readonly name = '${capabilityName}';
  readonly supportedMarkets = ['US', 'HK'];
  readonly supportedSymbolFormats = ['SYMBOL.MARKET'];

  async execute(request: DataRequest): Promise<DataResponse> {
    // TODO: 实现具体的数据获取逻辑
    throw new Error('Method not implemented');
  }
}

export default ${className};
`;
  }

  private static async generateTypesFile(providerName: string): Promise<string> {
    return `/**
 * ${providerName} 数据源类型定义
 */

export interface ${this.toPascalCase(providerName)}Config {
  // TODO: 定义配置类型
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ${this.toPascalCase(providerName)}Response {
  // TODO: 定义响应类型
  success: boolean;
  data?: any;
  error?: string;
}
`;
  }

  private static async generateReadmeFile(
    providerName: string, 
    capabilities: string[], 
    description: string
  ): Promise<string> {
    return `# ${this.toPascalCase(providerName)} 数据源

${description}

## 支持的能力

${capabilities.map(cap => `- \`${cap}\``).join('\n')}

## 配置说明

\`\`\`typescript
// TODO: 添加配置示例
\`\`\`

## 使用方法

\`\`\`typescript
// TODO: 添加使用示例
\`\`\`

## 开发说明

1. 实现所有能力的具体逻辑
2. 配置正确的市场和股票代码格式支持
3. 添加错误处理和重试机制
4. 编写单元测试和集成测试

## 测试

\`\`\`bash
# 运行测试
npm test -- ${providerName}
\`\`\`
`;
  }

  /**
   * 重新扫描并刷新注册表
   */
  private static async generateTestFiles(providerName: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    // 提供商测试文件
    files[`tests/${providerName}.provider.spec.ts`] = `import { Test, TestingModule } from '@nestjs/testing';
import { ${this.toPascalCase(providerName)}Provider } from '../index';

describe('${this.toPascalCase(providerName)}Provider', () => {
  let provider: ${this.toPascalCase(providerName)}Provider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${this.toPascalCase(providerName)}Provider],
    }).compile();

    provider = module.get<${this.toPascalCase(providerName)}Provider>(${this.toPascalCase(providerName)}Provider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should initialize successfully', async () => {
    await expect(provider.initialize()).resolves.not.toThrow();
  });

  it('should test connection successfully', async () => {
    const result = await provider.testConnection();
    expect(typeof result).toBe('boolean');
  });
});
`;

    return files;
  }

  private static toPascalCase(str: string): string {
    return str
      .split(/[-\s_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}