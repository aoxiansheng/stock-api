import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

/**
 * 简化的文件搜索工具，避免glob依赖问题
 */
export class GlobWrapper {
  /**
   * 递归搜索文件
   */
  static async searchFiles(
    pattern: string,
    options: { 
      ignore?: string[];
      rootDir?: string;
    } = {}
  ): Promise<string[]> {
    const { ignore = ['node_modules', 'dist', '.git'], rootDir = process.cwd() } = options;
    const results: string[] = [];

    // 解析模式
    const { directory, filePattern } = this.parsePattern(pattern);
    const searchDir = path.resolve(rootDir, directory);

    try {
      await this.walkDirectory(searchDir, filePattern, ignore, results, rootDir);
    } catch (error) {
      // 如果目录不存在或无权限，返回空数组
      return [];
    }

    return results;
  }

  /**
   * 解析搜索模式
   */
  private static parsePattern(pattern: string): { directory: string; filePattern: RegExp } {
    // 简单的模式解析
    if (pattern.includes('**')) {
      const parts = pattern.split('**');
      const directory = parts[0].replace(/\/$/, '') || '.';
      const fileExtension = parts[1].replace(/^\//, '').replace(/\*\./g, '');
      
      // 创建正则表达式
      let regexPattern = fileExtension.replace(/\*/g, '.*');
      if (fileExtension.includes('.')) {
        regexPattern = regexPattern.replace(/\\\./g, '\\.');
      }
      
      return {
        directory,
        filePattern: new RegExp(regexPattern + '$')
      };
    }

    // 单层搜索
    const directory = path.dirname(pattern);
    const filename = path.basename(pattern);
    const regexPattern = filename.replace(/\*/g, '.*').replace(/\./g, '\\.');
    
    return {
      directory,
      filePattern: new RegExp(regexPattern + '$')
    };
  }

  /**
   * 递归遍历目录
   */
  private static async walkDirectory(
    dir: string,
    filePattern: RegExp,
    ignore: string[],
    results: string[],
    rootDir: string
  ): Promise<void> {
    let entries: fsSync.Dirent[];
    
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      // 无权限访问或目录不存在
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      // 检查是否应该忽略
      if (ignore.some(ignorePath => relativePath.includes(ignorePath))) {
        continue;
      }

      if (entry.isDirectory()) {
        // 递归搜索子目录
        await this.walkDirectory(fullPath, filePattern, ignore, results, rootDir);
      } else if (entry.isFile()) {
        // 检查文件是否匹配模式
        if (filePattern.test(entry.name)) {
          results.push(relativePath);
        }
      }
    }
  }

  /**
   * 专门用于TypeScript文件搜索
   */
  static async findTypeScriptFiles(directory: string = 'src'): Promise<string[]> {
    return this.searchFiles(`${directory}/**/*.ts`);
  }

  /**
   * 专门用于测试文件搜索
   */
  static async findTestFiles(directory: string = 'test'): Promise<string[]> {
    return this.searchFiles(`${directory}/**/*.spec.ts`);
  }

  /**
   * 专门用于DTO文件搜索
   */
  static async findDtoFiles(directory: string = 'src'): Promise<string[]> {
    return this.searchFiles(`${directory}/**/*.dto.ts`);
  }

  /**
   * 专门用于服务文件搜索
   */
  static async findServiceFiles(directory: string = 'src'): Promise<string[]> {
    return this.searchFiles(`${directory}/**/*.service.ts`);
  }

  /**
   * 专门用于快照文件搜索
   */
  static async findSnapshotFiles(): Promise<string[]> {
    return this.searchFiles('**/__snapshots__/*.snap');
  }

  /**
   * 专门用于配置文件搜索
   */
  static async findConfigFiles(): Promise<string[]> {
    const jsonFiles = await this.searchFiles('**/*.json', { ignore: ['node_modules', 'dist', '.git', 'coverage'] });
    const yamlFiles = await this.searchFiles('**/*.{yaml,yml}', { ignore: ['node_modules', 'dist', '.git', 'coverage'] });
    return [...jsonFiles, ...yamlFiles];
  }
}