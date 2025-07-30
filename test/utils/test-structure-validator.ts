import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

/**
 * 综合测试结构验证器
 * 按照用户要求重构,完成所有步骤
 */
export class TestStructureValidator {
  private readonly srcRoot = "src";
  private readonly testRoot = "test";
  
  private projectStructure: ProjectStructure | null = null;
  private testStructure: TestStructure | null = null;
  private validationResults: ValidationResults = {
    fileNamingIssues: [],
    directoryMismatches: [],
    orphanedTestFiles: [],
    missingTestFiles: [],
    potentialMatches: [],
    repairPlan: null,
    directoryComparison: null
  };

  /**
   * 9. 对比 src 和 test 子目录结构
   * 检查test/jest/{category}下的目录结构是否与src目录结构对应
   */
  async compareDirectoryStructures(): Promise<DirectoryComparisonResult> {
    console.log("🔍 步骤9: 对比目录结构...");
    if (!this.projectStructure) {
      await this.scanProjectDirectory();
    }

    const srcDirs = new Set(this.projectStructure.srcDirectories);
    const testCategories = ['unit', 'integration', 'e2e', 'security'];
    const comparisonResult: DirectoryComparisonResult = {};

    for (const category of testCategories) {
      const testSubRoot = path.join(this.testRoot, 'jest', category);
      
      // 获取该测试类别下的所有目录
      const testDirsRaw = await glob(`${testSubRoot}/**/`);
      const testDirs = new Set(
        testDirsRaw
          .map(dir => path.relative(testSubRoot, dir))
          .filter(dir => dir !== '' && !dir.startsWith('.')) // 过滤空目录和隐藏目录
          .map(dir => dir.replace(/\/$/, '')) // 移除末尾斜杠
      );

      // 正向验证：src中存在但test中缺失的目录
      const missingInTest = [...srcDirs].filter(dir => !testDirs.has(dir));
      
      // 反向验证：test中存在但src中不存在的目录（孤立目录）
      const orphanedInTest = [...testDirs].filter(dir => !srcDirs.has(dir));

      comparisonResult[category] = {
        missing: missingInTest.sort(),
        orphaned: orphanedInTest.sort(),
      };

      console.log(`  📂 ${category}: 缺失${missingInTest.length}个, 多余${orphanedInTest.length}个目录`);
    }

    this.validationResults.directoryComparison = comparisonResult;
    console.log("✅ 目录结构对比完成。");
    return comparisonResult;
  }

  /**
   * 1. 扫描项目目录,确认现有文件目录树和子文件
   */
  async scanProjectDirectory(): Promise<ProjectStructure> {
    console.log("🔍 步骤1: 扫描项目目录结构...");
    
    const srcFiles = await glob(`${this.srcRoot}/**/*.ts`);
    const testFiles = await glob(`${this.testRoot}/**/*.{ts,js}`);
    
    this.projectStructure = {
      srcRoot: this.srcRoot,
      testRoot: this.testRoot,
      srcFiles: srcFiles.sort(),
      testFiles: testFiles.sort(),
      srcDirectories: this.extractDirectories(srcFiles, this.srcRoot),
      testDirectories: this.extractDirectories(testFiles, this.testRoot)
    };

    console.log(`✅ 扫描完成: ${srcFiles.length} 个源文件, ${testFiles.length} 个测试文件`);
    console.log(`📁 源目录: ${this.projectStructure.srcDirectories.length} 个`);
    console.log(`📁 测试目录: ${this.projectStructure.testDirectories.length} 个`);
    
    return this.projectStructure;
  }

  /**
   * 2. 扫描test目录,对所有测试代码文件文件名进行合规检查,并且更名
   */
  async validateAndRenameTestFiles(): Promise<FileNamingResult> {
    console.log("🔍 步骤2: 检查测试文件命名规范...");
    
    if (!this.projectStructure) {
      await this.scanProjectDirectory();
    }

    const namingRules: { [key: string]: RegExp } = {
      "test/jest/unit": /^.*\.spec\.ts$/,
      "test/jest/integration": /^.*\.integration\.test\.ts$/,
      "test/jest/e2e": /^.*\.e2e\.test\.ts$/,
      "test/jest/security": /^.*\.security\.test\.ts$/,
      "test/k6": /^.*\.perf\.test\.js$/
    };

    const namingIssues: FileNamingIssue[] = [];
    const renameCommands: RenameCommand[] = [];

    for (const testFile of this.projectStructure!.testFiles) {
      const issue = this.checkFileNaming(testFile, namingRules);
      if (issue) {
        namingIssues.push(issue);
        
        // 生成重命名命令
        const suggestedName = this.generateCompliantFileName(testFile);
        if (suggestedName !== testFile) {
          renameCommands.push({
            originalPath: testFile,
            suggestedPath: suggestedName,
            reason: issue.reason,
            command: `mv "${testFile}" "${suggestedName}"`
          });
        }
      }
    }

    this.validationResults.fileNamingIssues = namingIssues;

    console.log(`✅ 命名检查完成: ${namingIssues.length} 个不合规文件`);
    
    return {
      issues: namingIssues,
      renameCommands,
      summary: `发现 ${namingIssues.length} 个命名不合规的文件，需要 ${renameCommands.length} 个重命名操作`
    };
  }

  /**
   * 3. 再次扫描test目录树和子文件
   */
  async rescanTestDirectory(): Promise<TestStructure> {
    console.log("🔍 步骤3: 重新扫描测试目录结构...");
    
    const testFiles = await glob(`${this.testRoot}/**/*.{ts,js}`);
    const unitTestFiles = await glob(`${this.testRoot}/jest/unit/**/*.spec.ts`);
    const integrationTestFiles = await glob(`${this.testRoot}/jest/integration/**/*.integration.test.ts`);
    const e2eTestFiles = await glob(`${this.testRoot}/jest/e2e/**/*.e2e.test.ts`);
    const securityTestFiles = await glob(`${this.testRoot}/jest/security/**/*.security.test.ts`);
    const perfTestFiles = await glob(`${this.testRoot}/k6/**/*.perf.test.js`);

    this.testStructure = {
      allTestFiles: testFiles.sort(),
      unitTestFiles: unitTestFiles.sort(),
      integrationTestFiles: integrationTestFiles.sort(),
      e2eTestFiles: e2eTestFiles.sort(),
      securityTestFiles: securityTestFiles.sort(),
      perfTestFiles: perfTestFiles.sort(),
      testDirectories: this.extractDirectories(testFiles, this.testRoot)
    };

    console.log(`✅ 重新扫描完成:`);
    console.log(`  📋 总测试文件: ${testFiles.length} 个`);
    console.log(`  🧪 单元测试: ${unitTestFiles.length} 个`);
    console.log(`  🔗 集成测试: ${integrationTestFiles.length} 个`);
    console.log(`  🌐 E2E测试: ${e2eTestFiles.length} 个`);
    console.log(`  🔒 安全测试: ${securityTestFiles.length} 个`);
    console.log(`  ⚡ 性能测试: ${perfTestFiles.length} 个`);

    return this.testStructure;
  }

  /**
   * 4. 检测test目录内的子文件是否存在测试文件与被测试目标文件目录不一致,记录不一致的部分
   */
  async detectDirectoryMismatches(): Promise<DirectoryMismatch[]> {
    console.log("🔍 步骤4: 检测目录结构不一致...");
    if (!this.projectStructure || !this.testStructure) {
      throw new Error("请先执行扫描步骤");
    }

    const mismatches: DirectoryMismatch[] = [];

    const testFilesToCheck = [
      ...this.testStructure.unitTestFiles,
      ...this.testStructure.integrationTestFiles,
      ...this.testStructure.e2eTestFiles,
      ...this.testStructure.securityTestFiles,
    ];

    for (const testFile of testFilesToCheck) {
      const correspondingSrcFile = this.findCorrespondingSourceFile(testFile);

      if (correspondingSrcFile) {
        const testCategory = this.determineTestCategory(testFile);
        if (testCategory === 'unknown' || testCategory === 'k6') {
          continue;
        }

        const testTypePath = path.join(this.testRoot, 'jest', testCategory);
        const testRelDir = this.getRelativeDirectory(testFile, testTypePath);
        const srcRelDir = this.getRelativeDirectory(correspondingSrcFile, this.srcRoot);

        if (!this.isValidDirectoryMapping(srcRelDir, testRelDir)) {
          mismatches.push({
            testFile,
            sourceFile: correspondingSrcFile,
            testDirectory: testRelDir,
            sourceDirectory: srcRelDir,
            expectedTestPath: this.generateExpectedTestPathWithCategory(correspondingSrcFile, testCategory),
            severity: 'warning',
          });
        }
      }
    }

    this.validationResults.directoryMismatches = mismatches;
    console.log(`✅ 目录结构检查完成: ${mismatches.length} 个不一致项`);
    return mismatches;
  }

  /**
   * 5. 检测test目录内全部子文件,是否存在多余测试文件,记录多余的部分
   */
  async detectOrphanedTestFiles(): Promise<OrphanedTestFile[]> {
    console.log("🔍 步骤5: 检测多余的测试文件...");
    
    if (!this.projectStructure || !this.testStructure) {
      throw new Error("请先执行扫描步骤");
    }

    const orphanedFiles: OrphanedTestFile[] = [];
    const potentialMatches: PotentialMatch[] = [];

    // 检查所有测试文件
    for (const testFile of this.testStructure.allTestFiles) {
      // 跳过配置文件和工具文件
      if (this.isConfigOrUtilFile(testFile)) {
        continue;
      }
      
      // 跳过应排除的特殊性能测试文件
      if (this.shouldExcludeTestFile(testFile)) {
        console.log(`  ⏭️ 跳过特殊性能测试文件: ${testFile}`);
        continue;
      }

      // 首先尝试精确匹配
      const exactMatch = this.findCorrespondingSourceFile(testFile);
      
      if (exactMatch) {
        continue; // 有精确匹配，跳过
      }

      // 如果没有精确匹配，尝试智能匹配
      const intelligentMatch = this.findIntelligentSourceMatch(testFile);
      
      if (intelligentMatch && intelligentMatch.confidence > 0.3) {
        potentialMatches.push({
          testFile,
          sourceFile: intelligentMatch.sourceFile,
          confidence: intelligentMatch.confidence,
          reason: intelligentMatch.reason,
          suggestedAction: `可能匹配 ${intelligentMatch.sourceFile}，建议${intelligentMatch.suggestedFix}`
        });
      } else {
        // 真正的孤立文件
        orphanedFiles.push({
          testFile,
          reason: intelligentMatch ? 
            `最佳匹配置信度过低 (${(intelligentMatch.confidence * 100).toFixed(1)}%)` : 
            "找不到任何对应的源文件",
          testType: this.determineTestType(testFile),
          suggestedAction: "检查是否为遗留文件，考虑删除"
        });
      }
    }

    this.validationResults.orphanedTestFiles = orphanedFiles;
    
    // 计算排除的特殊测试文件数量及分类
    const excludedFiles = this.testStructure ? this.testStructure.allTestFiles.filter(f => this.shouldExcludeTestFile(f)) : [];
    const k6Count = excludedFiles.filter(f => f.includes('/k6/')).length;
    const blackboxCount = excludedFiles.filter(f => f.includes('/blackbox/')).length;
    const otherExcludedCount = excludedFiles.length - k6Count - blackboxCount;
    
    console.log(`✅ 多余文件检查完成:`);
    console.log(`  🗑️  真正孤立: ${orphanedFiles.length} 个 (建议删除)`);
    console.log(`  🔄 可能匹配: ${potentialMatches.length} 个 (需要检查并移动)`);
    console.log(`  ⏭️ 已排除文件: ${excludedFiles.length} 个`);
    if (k6Count > 0) console.log(`    📊 性能测试: ${k6Count} 个`);
    if (blackboxCount > 0) console.log(`    🧪 黑盒测试: ${blackboxCount} 个`);
    if (otherExcludedCount > 0) console.log(`    🔍 其他: ${otherExcludedCount} 个`);
    
    // 将潜在匹配添加到验证结果中
    this.validationResults.potentialMatches = potentialMatches;
    
    return orphanedFiles;
  }

  /**
   * 6. 测试test目录内全部子文件,针对测试目标目录,列出缺失测试的目录和文件名
   */
  async detectMissingTestFiles(): Promise<MissingTestFile[]> {
    console.log("🔍 步骤6: 检测缺失的测试文件...");
    
    if (!this.projectStructure) {
      throw new Error("请先执行扫描步骤");
    }

    const missingTestFiles: MissingTestFile[] = [];

    // 分析每个源文件是否需要测试
    for (const srcFile of this.projectStructure.srcFiles) {
      const fileType = this.analyzeSourceFileType(srcFile);
      
      if (fileType.needsTest) {
        const expectedTestFile = this.generateExpectedTestPath(srcFile);
        
        // 检查是否存在对应的测试文件
        if (!fs.existsSync(expectedTestFile)) {
          // 尝试找到任何可能的匹配测试文件
          const existingTest = this.findAnyMatchingTestFile(srcFile);
          
          missingTestFiles.push({
            sourceFile: srcFile,
            expectedTestPath: expectedTestFile,
            sourceFileType: fileType.type,
            priority: fileType.priority,
            existingTestFile: existingTest,
            suggestedAction: existingTest ? "重命名现有测试文件" : "创建新测试文件"
          });
        }
      }
    }

    this.validationResults.missingTestFiles = missingTestFiles;
    
    console.log(`✅ 缺失文件检查完成: ${missingTestFiles.length} 个缺失测试文件`);
    
    return missingTestFiles;
  }

  /**
   * 7. 制定修复计划
   */
  async createRepairPlan(): Promise<RepairPlan> {
    console.log("🔍 步骤7: 制定修复计划...");
    
    // 计算目录结构问题数量
    let directoryStructureIssues = 0;
    if (this.validationResults.directoryComparison) {
      for (const comparison of Object.values(this.validationResults.directoryComparison)) {
        directoryStructureIssues += comparison.missing.length + comparison.orphaned.length;
      }
    }

    const plan: RepairPlan = {
      summary: {
        fileNamingIssues: this.validationResults.fileNamingIssues.length,
        directoryMismatches: this.validationResults.directoryMismatches.length,
        orphanedTestFiles: this.validationResults.orphanedTestFiles.length,
        potentialMatches: this.validationResults.potentialMatches?.length || 0,
        missingTestFiles: this.validationResults.missingTestFiles.length,
        directoryStructureIssues: directoryStructureIssues,
        totalIssues: 0
      },
      actions: [],
      commands: [],
      estimatedTime: "5-15分钟"
    };

    // 计入所有问题类型
    plan.summary.totalIssues = plan.summary.fileNamingIssues + 
                              plan.summary.directoryMismatches + 
                              plan.summary.orphanedTestFiles + 
                              plan.summary.missingTestFiles + 
                              directoryStructureIssues;

    // 阶段1: 创建缺失的目录结构 (必须最先执行)
    if (this.validationResults.directoryComparison) {
      for (const [category, comparison] of Object.entries(this.validationResults.directoryComparison)) {
        // 创建缺失的目录
        for (const missingDir of comparison.missing) {
          const targetPath = path.join(this.testRoot, 'jest', category, missingDir);
          plan.actions.push({
            type: "create",
            description: `[阶段1] 创建缺失的测试目录: test/jest/${category}/${missingDir}`,
            command: `mkdir -p "${targetPath}"`,
            priority: "high", // 提升优先级，确保最先执行
            risk: "low",
            phase: "1-create-dirs" // 添加阶段标识
          });
          plan.commands.push(`# 阶段1: 创建缺失目录`);
          plan.commands.push(`mkdir -p "${targetPath}"`);
        }
      }
    }

    // 阶段2: 文件重命名操作
    const namingResult = await this.validateAndRenameTestFiles();
    for (const renameCmd of namingResult.renameCommands) {
      plan.actions.push({
        type: "rename",
        description: `[阶段2] 重命名文件: ${path.basename(renameCmd.originalPath)} → ${path.basename(renameCmd.suggestedPath)}`,
        command: renameCmd.command,
        priority: "high",
        risk: "low",
        phase: "2-rename-files"
      });
      plan.commands.push(`# 阶段2: 文件重命名`);
      plan.commands.push(renameCmd.command);
    }

    // 阶段3: 目录结构调整 - 移动测试文件
    for (const mismatch of this.validationResults.directoryMismatches) {
      const targetDir = path.dirname(mismatch.expectedTestPath);
      plan.actions.push({
        type: "move",
        description: `[阶段3] 移动测试文件到正确目录: ${mismatch.testFile} → ${mismatch.expectedTestPath}`,
        command: `mkdir -p "${targetDir}" && mv "${mismatch.testFile}" "${mismatch.expectedTestPath}"`,
        priority: "medium",
        risk: "low",
        phase: "3-move-files"
      });
      // 使用独立命令，更安全的方式
      plan.commands.push(`# 阶段3: 移动测试文件`);
      plan.commands.push(`mkdir -p "${targetDir}"`);
      plan.commands.push(`if [ -f "${mismatch.testFile}" ]; then`);
      plan.commands.push(`  if [ -f "${mismatch.expectedTestPath}" ]; then`);
      plan.commands.push(`    echo "⚠️  目标文件已存在，将使用备份名称"`);
      plan.commands.push(`    mv "${mismatch.testFile}" "${mismatch.expectedTestPath}.bak-$(date +%s)"`);
      plan.commands.push(`  else`);
      plan.commands.push(`    mv "${mismatch.testFile}" "${mismatch.expectedTestPath}"`);
      plan.commands.push(`  fi`);
      plan.commands.push(`else`);
      plan.commands.push(`  echo "❌ 源文件不存在: ${mismatch.testFile}"`);
      plan.commands.push(`fi`);
    }

    // 阶段4: 处理潜在匹配的文件 - 智能移动
    if (this.validationResults.potentialMatches) {
      // 按照置信度排序
      const sortedMatches = [...this.validationResults.potentialMatches].sort((a, b) => b.confidence - a.confidence);
      
      // 按测试类别分组处理潜在匹配
      const matchesByCategory = new Map<string, typeof sortedMatches>();
      
      // 将匹配项按测试类别分组
      for (const match of sortedMatches) {
        const sourceCategory = this.determineTestCategory(match.testFile);
        // 跳过无法确定类别的测试文件
        if (sourceCategory === 'unknown') continue;
        
        if (!matchesByCategory.has(sourceCategory)) {
          matchesByCategory.set(sourceCategory, []);
        }
        matchesByCategory.get(sourceCategory)!.push(match);
      }
      
      // 对每个测试类别分别处理匹配项
      for (const [category, matches] of matchesByCategory.entries()) {
        for (const match of matches) {
          // 严格使用原始测试类别生成目标路径，确保不会跨越类别边界
          const targetPath = this.generateExpectedTestPathWithCategory(match.sourceFile, category);
          const targetDir = path.dirname(targetPath);
          
          // 验证目标路径是否在相同的测试类别中，使用专门的验证方法
          if (!this.validateSameTestCategory(match.testFile, targetPath)) {
            // 如果目标路径会导致跨类别，则跳过此匹配
            console.log(`⚠️ 跳过会导致跨测试类别的匹配: ${match.testFile} → ${targetPath}`);
            console.log(`   源类别: ${this.determineTestCategory(match.testFile)}, 目标类别: ${this.determineTestCategory(targetPath)}`);
            continue;
          }
          
          // 根据置信度调整优先级和风险
          let priority: "high" | "medium" | "low" = "medium";
          let risk: "high" | "medium" | "low" = "medium";
          
          if (match.confidence > 0.8) {
            priority = "high";
            risk = "low";
          } else if (match.confidence < 0.5) {
            priority = "low";
            risk = "medium";
          }
          
          plan.actions.push({
            type: "move",
            description: `[阶段4] 智能匹配修复: ${path.basename(match.testFile)} → ${path.basename(targetPath)} (置信度: ${(match.confidence * 100).toFixed(1)}%, 严格保持在${category}类别)`,
            command: `mkdir -p "${targetDir}" && mv "${match.testFile}" "${targetPath}"`,
            priority,
            risk,
            phase: "4-intelligent-move"
          });
          plan.commands.push(`# 阶段4: 智能匹配移动 (置信度: ${(match.confidence * 100).toFixed(1)}%, 类别: ${category})`);
          plan.commands.push(`mkdir -p "${targetDir}"`);
          
          // 使用更安全的方式处理文件移动
          plan.commands.push(`if [ -f "${match.testFile}" ]; then`);
          plan.commands.push(`  if [ -f "${targetPath}" ]; then`);
          plan.commands.push(`    echo "⚠️  目标文件已存在: ${targetPath}，将使用备份名称"`);
          plan.commands.push(`    mv "${match.testFile}" "${targetPath}.bak-$(date +%s)"`);
          plan.commands.push(`  else`);
          plan.commands.push(`    mv "${match.testFile}" "${targetPath}"`);
          plan.commands.push(`  fi`);
          plan.commands.push(`else`);
          plan.commands.push(`  echo "❌ 源文件不存在: ${match.testFile}"`);
          plan.commands.push(`fi`);
        }
      }
    }

    // 阶段5: 创建缺失的测试文件
    for (const missing of this.validationResults.missingTestFiles) {
      if (missing.priority === "high") {
        const targetDir = path.dirname(missing.expectedTestPath);
        plan.actions.push({
          type: "create",
          description: `[阶段5] 创建测试文件: ${missing.expectedTestPath}`,
          command: `mkdir -p "${targetDir}" && touch "${missing.expectedTestPath}"`,
          priority: "high",
          risk: "low",
          phase: "5-create-files"
        });
        plan.commands.push(`# 阶段5: 创建缺失测试文件`);
        plan.commands.push(`mkdir -p "${targetDir}"`);
        plan.commands.push(`touch "${missing.expectedTestPath}"`);
      }
    }

    // 阶段6: 删除真正孤立的测试文件
    for (const orphaned of this.validationResults.orphanedTestFiles) {
      plan.actions.push({
        type: "delete",
        description: `[阶段6] 删除孤立测试文件: ${orphaned.testFile} (${orphaned.reason})`,
        command: `rm "${orphaned.testFile}"`,
        priority: "low",
        risk: "medium",
        phase: "6-delete-orphaned-files"
      });
      plan.commands.push(`# 阶段6: 删除孤立文件`);
      plan.commands.push(`rm "${orphaned.testFile}"`);
    }

    // 阶段7: 检测并删除空的冗余目录 (在所有文件移动完成后)
    if (this.validationResults.directoryComparison) {
      for (const [category, comparison] of Object.entries(this.validationResults.directoryComparison)) {
        // 处理可能为空的冗余目录
        for (const orphanedDir of comparison.orphaned) {
          const orphanedPath = path.join(this.testRoot, 'jest', category, orphanedDir);
          plan.actions.push({
            type: "delete",
            description: `[阶段7] 检查并删除空的冗余目录: test/jest/${category}/${orphanedDir} (src/中无对应目录)`,
            command: `# 检查目录是否为空并删除\nif [ -d "${orphanedPath}" ] && [ -z "$(ls -A "${orphanedPath}")" ]; then\n  rmdir "${orphanedPath}"\n  echo "已删除空目录: ${orphanedPath}"\nelse\n  echo "目录非空或不存在，跳过: ${orphanedPath}"\nfi`,
            priority: "low",
            risk: "low", // 降低风险，因为只删除空目录
            phase: "7-cleanup-empty-dirs"
          });
          plan.commands.push(`# 阶段7: 清理空的冗余目录`);
          plan.commands.push(`# 检查并删除空目录: ${orphanedPath}`);
          plan.commands.push(`if [ -d "${orphanedPath}" ] && [ -z "$(ls -A "${orphanedPath}")" ]; then`);
          plan.commands.push(`  rmdir "${orphanedPath}"`);
          plan.commands.push(`  echo "✅ 已删除空目录: ${orphanedPath}"`);
          plan.commands.push(`else`);
          plan.commands.push(`  echo "⚠️  目录非空或不存在，跳过: ${orphanedPath}"`);
          plan.commands.push(`fi`);
        }
      }
    }

    this.validationResults.repairPlan = plan;
    
    console.log(`✅ 修复计划制定完成:`);
    console.log(`  📊 总问题数: ${plan.summary.totalIssues}`);
    console.log(`  ⚡ 操作数: ${plan.actions.length}`);
    console.log(`  📝 命令数: ${plan.commands.length}`);
    
    return plan;
  }

  /**
   * 8. 生成修复脚本供用户预览和执行
   */
  async generateRepairScript(outputPath: string = "test-structure-repair.sh"): Promise<string> {
    console.log("🔍 步骤8: 生成修复脚本...");
    
    if (!this.validationResults.repairPlan) {
      await this.createRepairPlan();
    }

    const plan = this.validationResults.repairPlan!;
    const script = this.buildRepairScript(plan);

    fs.writeFileSync(outputPath, script, { mode: 0o755 });
    
    console.log(`✅ 修复脚本已生成: ${outputPath}`);
    console.log(`   📄 包含 ${plan.commands.length} 个命令`);
    console.log(`   🚀 执行: ./${outputPath}`);
    
    return outputPath;
  }

  /**
   * 一键执行所有步骤
   */
  async executeFullValidation(): Promise<ValidationSummary> {
    console.log("🚀 开始完整的测试结构验证...");
    console.log("=" .repeat(60));

    const startTime = Date.now();

    try {
      // 执行所有步骤
      const projectStructure = await this.scanProjectDirectory();
      const namingResult = await this.validateAndRenameTestFiles();
      const testStructure = await this.rescanTestDirectory();
      const directoryMismatches = await this.detectDirectoryMismatches();
      const orphanedFiles = await this.detectOrphanedTestFiles();
      const missingFiles = await this.detectMissingTestFiles();
      const directoryComparisonResult = await this.compareDirectoryStructures();
      const repairPlan = await this.createRepairPlan();

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      const summary: ValidationSummary = {
        executionTime: `${duration.toFixed(2)}秒`,
        projectStructure,
        testStructure,
        namingResult,
        directoryMismatches,
        orphanedFiles,
        missingFiles,
        repairPlan,
        recommendations: this.generateRecommendations(),
        directoryComparisonResult
      };

      this.printSummaryReport(summary);
      
      const totalIssues = summary.namingResult.issues.length + 
                         summary.directoryMismatches.length + 
                         summary.orphanedFiles.length + 
                         summary.missingFiles.length;
                         
      if (totalIssues > 0) {
        console.log("\n🎉 验证完成! 发现 " + totalIssues + " 个问题需要修复。");
      } else {
        console.log("\n🎉 验证完成! 没有发现需要修复的问题。");
      }
      
      return summary;

    } catch (error) {
      console.error("❌ 验证过程中发生错误:", error);
      throw error;
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const plan = this.validationResults.repairPlan;

    if (!plan) return recommendations;

    if (plan.summary.fileNamingIssues > 0) {
      recommendations.push(`🏷️  修复 ${plan.summary.fileNamingIssues} 个文件命名问题`);
    }

    if (plan.summary.directoryMismatches > 0) {
      recommendations.push(`📁 调整 ${plan.summary.directoryMismatches} 个目录结构不匹配的文件`);
    }

    if (plan.summary.potentialMatches > 0) {
      recommendations.push(`🔄 处理 ${plan.summary.potentialMatches} 个潜在匹配文件 (智能匹配)`);
    }

    if (plan.summary.orphanedTestFiles > 0) {
      recommendations.push(`🗑️  删除 ${plan.summary.orphanedTestFiles} 个真正孤立的测试文件`);
    }

    if (plan.summary.missingTestFiles > 0) {
      recommendations.push(`✨ 创建 ${plan.summary.missingTestFiles} 个缺失的测试文件`);
    }

    if (plan.summary.directoryStructureIssues > 0) {
      recommendations.push(`📁 修复 ${plan.summary.directoryStructureIssues} 个目录结构问题 (创建缺失目录/处理多余目录)`);
    }

    if (plan.summary.totalIssues === 0 && plan.summary.potentialMatches === 0) {
      recommendations.push("✅ 测试结构完全符合规范，无需修复");
    } else {
      recommendations.push("🔧 使用 generateRepairScript() 生成自动修复脚本");
      recommendations.push("🔍 执行修复后建议重新验证结构");
    }

    return recommendations;
  }

  /**
   * 打印汇总报告
   */
  private printSummaryReport(summary: ValidationSummary): void {
    console.log("\n📋 测试结构验证汇总报告");
    console.log("=" .repeat(60));
    
    console.log(`⏱️  执行时间: ${summary.executionTime}`);
    console.log(`📁 源文件: ${summary.projectStructure.srcFiles.length} 个`);
    console.log(`🧪 测试文件: ${summary.testStructure.allTestFiles.length} 个`);
    
    console.log("\n🔍 问题统计:");
    console.log(`  🏷️  文件命名问题: ${summary.namingResult.issues.length} 个`);
    console.log(`  📁 目录不匹配: ${summary.directoryMismatches.length} 个`);
    console.log(`  🔄 智能匹配: ${this.validationResults.potentialMatches.length} 个 (不计入问题总数)`);
    console.log(`  🗑️  孤立测试文件: ${summary.orphanedFiles.length} 个`);
    console.log(`  ✨ 缺失测试文件: ${summary.missingFiles.length} 个`);
    
    const totalIssues = summary.namingResult.issues.length + 
                       summary.directoryMismatches.length + 
                       summary.orphanedFiles.length + 
                       summary.missingFiles.length;
    
    console.log(`\n📊 总计问题: ${totalIssues} 个`);
    
    if (totalIssues > 0) {
      console.log(`🔧 修复操作: ${summary.repairPlan.actions.length} 个`);
      console.log(`📝 修复命令: ${summary.repairPlan.commands.length} 个`);
    }

    console.log("\n💡 建议操作:");
    summary.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    // 打印详细的文件列表
    this.printDetailedFileLists();

    console.log("\n📁 目录结构对比 (test/jest/{category} vs src):");
    if (summary.directoryComparisonResult) {
      for (const [category, result] of Object.entries(summary.directoryComparisonResult)) {
        console.log(`\n  📂 ${category} 测试类别:`);
        const missingCount = result.missing.length;
        const orphanedCount = result.orphaned.length;

        if (missingCount === 0 && orphanedCount === 0) {
          console.log("      ✅ 目录结构完全对应src目录");
        } else {
          if (missingCount > 0) {
            console.log(`      ❌ 缺失的目录 (${missingCount}个) - 需要在test/jest/${category}/下创建:`);
            // 只显示前5个，如果太多则折叠
            result.missing.slice(0, 5).forEach(dir => console.log(`        📁 ${dir}`));
            if (missingCount > 5) {
              console.log(`        ... (还有 ${missingCount - 5} 个)`);
            }
          }
          if (orphanedCount > 0) {
            console.log(`      🗑️  多余的目录 (${orphanedCount}个) - src/中不存在对应目录:`);
            result.orphaned.slice(0, 5).forEach(dir => console.log(`        📁 ${dir}`));
            if (orphanedCount > 5) {
              console.log(`        ... (还有 ${orphanedCount - 5} 个)`);
            }
          }
        }
      }
      
      // 添加修复建议
      const totalMissing = Object.values(summary.directoryComparisonResult)
        .reduce((sum, result) => sum + result.missing.length, 0);
      const totalOrphaned = Object.values(summary.directoryComparisonResult)
        .reduce((sum, result) => sum + result.orphaned.length, 0);
        
      if (totalMissing > 0 || totalOrphaned > 0) {
        console.log(`\n  💡 目录结构修复建议:`);
        if (totalMissing > 0) {
          console.log(`      - 共需创建 ${totalMissing} 个缺失目录以保持结构对应`);
        }
        if (totalOrphaned > 0) {
          console.log(`      - 共有 ${totalOrphaned} 个多余目录可能需要重命名或删除`);
        }
      }
    }

    console.log("\n🚀 后续操作:");
    console.log("  1. 查看详细列表: bun run test:validate-structure:list");
    console.log("  2. 生成修复脚本: bun run test:validate-structure:repair");
    console.log("  3. 执行修复脚本: bun run test:validate-structure:apply");
    console.log("  4. 重新验证结构: bun run test:validate-structure");
  }
  
  /**
   * 打印详细的文件列表
   */
  public printDetailedFileLists(): void {
    if (!this.validationResults) return;
    
    // 1. 潜在匹配文件
    if (this.validationResults.potentialMatches.length > 0) {
      console.log("\n🔄 潜在匹配文件清单:");
      
      // 按置信度分组
      const highConfidence = this.validationResults.potentialMatches.filter(m => m.confidence > 0.8);
      const mediumConfidence = this.validationResults.potentialMatches.filter(m => m.confidence <= 0.8 && m.confidence > 0.5);
      const lowConfidence = this.validationResults.potentialMatches.filter(m => m.confidence <= 0.5);
      
      // 高置信度
      if (highConfidence.length > 0) {
        console.log("  ⭐ 高置信度匹配 (>80%):");
        highConfidence.forEach((match, index) => {
          console.log(`    ${index + 1}. ${match.testFile} → ${match.sourceFile} (${(match.confidence * 100).toFixed(1)}%)`);
        });
      }
      
      // 中置信度
      if (mediumConfidence.length > 0) {
        console.log("  ✓ 中置信度匹配 (50-80%):");
        mediumConfidence.forEach((match, index) => {
          console.log(`    ${index + 1}. ${match.testFile} → ${match.sourceFile} (${(match.confidence * 100).toFixed(1)}%)`);
        });
      }
      
      // 低置信度
      if (lowConfidence.length > 0) {
        console.log("  ❓ 低置信度匹配 (<50%):");
        lowConfidence.forEach((match, index) => {
          console.log(`    ${index + 1}. ${match.testFile} → ${match.sourceFile} (${(match.confidence * 100).toFixed(1)}%)`);
        });
      }
    }
    
    // 2. 孤立测试文件
    if (this.validationResults.orphanedTestFiles.length > 0) {
      console.log("\n🗑️  真正孤立的测试文件清单:");
      this.validationResults.orphanedTestFiles.forEach((orphaned, index) => {
        console.log(`  ${index + 1}. ${orphaned.testFile} (${orphaned.reason})`);
      });
    }
    
    // 2.1 显示已排除的特殊测试文件
    if (this.testStructure) {
      const excludedFiles = this.testStructure.allTestFiles.filter(f => this.shouldExcludeTestFile(f));
      if (excludedFiles.length > 0) {
        console.log("\n⏭️  已排除的特殊测试文件:");
        
        // 按测试类别分组显示
        const k6Files = excludedFiles.filter(f => f.includes('/k6/'));
        const blackboxFiles = excludedFiles.filter(f => f.includes('/blackbox/'));
        const otherFiles = excludedFiles.filter(f => !f.includes('/k6/') && !f.includes('/blackbox/'));
        
        if (k6Files.length > 0) {
          console.log(`\n  📊 性能测试文件 (${k6Files.length}个):`);
          k6Files.forEach((file, index) => {
            console.log(`    ${index + 1}. ${file}`);
          });
        }
        
        if (blackboxFiles.length > 0) {
          console.log(`\n  🧪 黑盒测试文件 (${blackboxFiles.length}个):`);
          blackboxFiles.forEach((file, index) => {
            console.log(`    ${index + 1}. ${file}`);
          });
        }
        
        if (otherFiles.length > 0) {
          console.log(`\n  🔍 其他排除的测试文件 (${otherFiles.length}个):`);
          otherFiles.forEach((file, index) => {
            console.log(`    ${index + 1}. ${file}`);
          });
        }
        
        console.log("\n  注意: 上述文件不会被标记为孤立或进行任何移动/删除操作");
      }
    }
    
    // 3. 缺失测试文件
    if (this.validationResults.missingTestFiles.length > 0) {
      console.log("\n✨ 缺失的测试文件清单:");
      
      // 按优先级分组
      const highPriority = this.validationResults.missingTestFiles.filter(m => m.priority === 'high');
      const mediumPriority = this.validationResults.missingTestFiles.filter(m => m.priority === 'medium');
      const lowPriority = this.validationResults.missingTestFiles.filter(m => m.priority === 'low');
      
      // 高优先级
      if (highPriority.length > 0) {
        console.log("  🚨 高优先级 (核心逻辑):");
        highPriority.forEach((missing, index) => {
          console.log(`    ${index + 1}. ${missing.expectedTestPath} (源文件: ${missing.sourceFile})`);
        });
      }
      
      // 中优先级
      if (mediumPriority.length > 0) {
        console.log("  ⚠️ 中优先级:");
        mediumPriority.forEach((missing, index) => {
          console.log(`    ${index + 1}. ${missing.expectedTestPath} (源文件: ${missing.sourceFile})`);
        });
      }
      
      // 低优先级
      if (lowPriority.length > 0) {
        console.log("  📝 低优先级 (数据结构/工具类):");
        lowPriority.forEach((missing, index) => {
          console.log(`    ${index + 1}. ${missing.expectedTestPath} (源文件: ${missing.sourceFile})`);
        });
      }
    }
  }

  // ========== 辅助方法 ==========

  private extractDirectories(files: string[], rootPath: string): string[] {
    const dirs = new Set<string>();
    
    for (const file of files) {
      const relativePath = path.relative(rootPath, file);
      const dirPath = path.dirname(relativePath);
      
      if (dirPath !== ".") {
        // 添加当前目录
        dirs.add(dirPath);
        
        // 添加所有父目录层级
        const parts = dirPath.split("/").filter(part => part !== '');
        for (let i = 0; i < parts.length; i++) {
          const currentPath = parts.slice(0, i + 1).join("/");
          if (currentPath) {
            dirs.add(currentPath);
          }
        }
      }
    }
    
    return Array.from(dirs).sort();
  }

  private checkFileNaming(testFile: string, namingRules: { [key: string]: RegExp }): FileNamingIssue | null {
    const fileName = path.basename(testFile);
    
    for (const [dirPattern, filePattern] of Object.entries(namingRules)) {
      if (testFile.includes(dirPattern)) {
        if (!filePattern.test(fileName)) {
          return {
            file: testFile,
            reason: `文件名不符合 ${dirPattern} 目录的命名规范`,
            expectedPattern: filePattern.toString(),
            actualName: fileName
          };
        }
        break;
      }
    }
    
    return null;
  }

  private generateCompliantFileName(testFile: string): string {
    const dir = path.dirname(testFile);
    const baseName = path.basename(testFile, path.extname(testFile));
    
    if (testFile.includes("test/jest/unit")) {
      return path.join(dir, baseName + ".spec.ts");
    } else if (testFile.includes("test/jest/integration")) {
      return path.join(dir, baseName + ".integration.test.ts");
    } else if (testFile.includes("test/jest/e2e")) {
      return path.join(dir, baseName + ".e2e.test.ts");
    } else if (testFile.includes("test/jest/security")) {
      return path.join(dir, baseName + ".security.test.ts");
    } else if (testFile.includes("test/k6")) {
      return path.join(dir, baseName + ".perf.test.js");
    }
    
    return testFile;
  }

  private findCorrespondingSourceFile(testFile: string): string | null {
    if (!this.projectStructure) return null;

    const testBaseName = this.extractCoreFileName(path.basename(testFile));
    const testRelDir = this.getRelativeDirectory(testFile, this.testRoot);
    
    // 移除 jest/unit 等测试类型路径前缀
    const cleanTestDir = testRelDir.replace(/^jest\/(unit|integration|e2e|security)\//, '');
    
    // 在源文件中查找匹配
    for (const srcFile of this.projectStructure.srcFiles) {
      const srcBaseName = path.basename(srcFile, '.ts');
      const srcRelDir = this.getRelativeDirectory(srcFile, this.srcRoot);
      
      // 文件名匹配
      if (testBaseName === srcBaseName) {
        // 目录匹配或合理映射
        if (cleanTestDir === srcRelDir || this.isValidDirectoryMapping(srcRelDir, cleanTestDir)) {
          return srcFile;
        }
      }
    }
    
    return null;
  }

  /**
   * 智能匹配源文件 - 处理文件名或目录结构可能不完全匹配的情况
   * 严格遵循测试类别边界，不允许跨类别（unit/integration/e2e/security）的移动建议
   */
  private findIntelligentSourceMatch(testFile: string): IntelligentMatch | null {
    if (!this.projectStructure) return null;

    const testBaseName = this.extractCoreFileName(path.basename(testFile));
    const testRelDir = this.getRelativeDirectory(testFile, this.testRoot);
    const cleanTestDir = testRelDir.replace(/^jest\/(unit|integration|e2e|security)\//, '');
    const testType = this.determineTestType(testFile);
    
    // 确定当前测试文件所属的测试类别范围 - 这是我们的边界约束
    const testCategory = this.determineTestCategory(testFile);
    
    // 如果无法确定测试类别，不进行匹配
    if (testCategory === 'unknown') {
      return null;
    }
    
    let bestMatch: IntelligentMatch | null = null;
    let bestScore = 0;

    for (const srcFile of this.projectStructure.srcFiles) {
      const srcBaseName = path.basename(srcFile, '.ts');
      const srcRelDir = this.getRelativeDirectory(srcFile, this.srcRoot);
      
      let score = 0;
      const reasons: string[] = [];
      let suggestedFix = "";

      // 1. 文件名相似度评分 (0-0.6)
      const fileNameSimilarity = this.calculateStringSimilarity(testBaseName, srcBaseName);
      if (fileNameSimilarity > 0.8) {
        score += 0.6 * fileNameSimilarity;
        reasons.push(`文件名高度相似 (${(fileNameSimilarity * 100).toFixed(1)}%)`);
      } else if (fileNameSimilarity > 0.6) {
        score += 0.4 * fileNameSimilarity;
        reasons.push(`文件名部分相似 (${(fileNameSimilarity * 100).toFixed(1)}%)`);
      }

      // 2. 文件名包含关系 (0-0.4)
      if (testBaseName.includes(srcBaseName) || srcBaseName.includes(testBaseName)) {
        score += 0.4;
        reasons.push("文件名包含关系");
      }

      // 3. 模式匹配 (服务、控制器等) (0-0.3)
      const patternMatch = this.checkFilePatternMatch(testBaseName, srcBaseName);
      if (patternMatch.isMatch) {
        score += 0.3;
        reasons.push(`模式匹配: ${patternMatch.pattern}`);
      }

      // 4. 目录结构相似度 (0-0.4)
      const dirSimilarity = this.calculateDirectorySimilarity(cleanTestDir, srcRelDir);
      if (dirSimilarity > 0.8) {
        score += 0.4 * dirSimilarity;
        reasons.push(`目录结构高度相似 (${(dirSimilarity * 100).toFixed(1)}%)`);
      } else if (dirSimilarity > 0.5) {
        score += 0.2 * dirSimilarity;
        reasons.push(`目录结构部分相似 (${(dirSimilarity * 100).toFixed(1)}%)`);
      }
      
      // 5. 测试类型与源文件类型匹配 (0-0.2)
      const srcFileType = this.analyzeSourceFileType(srcFile);
      if (this.isTestTypeCompatible(testType, srcFileType.type)) {
        score += 0.2;
        reasons.push(`测试类型与源文件类型匹配`);
      }

      // 6. 生成修复建议 - 仅在同一测试类别内移动
      if (score > 0.3) {
        const suggestions: string[] = [];
        
        if (fileNameSimilarity < 1.0) {
          suggestions.push(`重命名为 ${srcBaseName}`);
        }
        
        if (dirSimilarity < 1.0) {
          // 重要修改：生成符合当前测试类别的期望路径，并严格保持在相同测试类别内
          const expectedPath = this.generateExpectedTestPathWithCategory(srcFile, testCategory);
          suggestions.push(`移动到 ${path.dirname(expectedPath)} (保持在${testCategory}类别内)`);
        }
        
        suggestedFix = suggestions.join(" 并 ");
      }

      // 更新最佳匹配
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          sourceFile: srcFile,
          confidence: score,
          reason: reasons.join(", "),
          suggestedFix: suggestedFix || "检查文件对应关系",
          // 保存匹配的测试类别
          targetCategory: testCategory
        };
      }
    }

    return bestMatch;
  }

  /**
   * 识别测试文件所属的测试类别
   * 增强版：优先按目录路径判断，然后再考虑文件名后缀
   * 严格遵守测试类别边界，确保准确识别
   */
  private determineTestCategory(testFile: string): string {
    // 优先通过目录路径判断 - 最可靠的方法
    if (testFile.includes('/jest/unit/')) return 'unit';
    if (testFile.includes('/jest/integration/')) return 'integration';
    if (testFile.includes('/jest/e2e/')) return 'e2e';
    if (testFile.includes('/jest/security/')) return 'security';
    if (testFile.includes('/k6/')) return 'k6';
    
    // 如果目录路径不明确，通过文件名后缀判断
    if (testFile.endsWith('.spec.ts')) return 'unit';
    if (testFile.endsWith('.integration.test.ts')) return 'integration';
    if (testFile.endsWith('.e2e.test.ts')) return 'e2e';
    if (testFile.endsWith('.security.test.ts')) return 'security';
    if (testFile.endsWith('.perf.test.js')) return 'k6';
    
    // 更多启发式判断 - 检查文件名中的关键词
    const fileName = path.basename(testFile).toLowerCase();
    if (fileName.includes('unit') || fileName.includes('spec')) return 'unit';
    if (fileName.includes('integration')) return 'integration';
    if (fileName.includes('e2e')) return 'e2e';
    if (fileName.includes('security')) return 'security';
    if (fileName.includes('perf') || fileName.includes('performance')) return 'k6';
    
    // 无法确定类别
    return 'unknown';
  }

  /**
   * 根据指定的测试类别生成期望的测试文件路径
   */
  private generateExpectedTestPathWithCategory(srcFile: string, category: string): string {
    const relativePath = path.relative(this.srcRoot, srcFile);
    const baseName = path.basename(relativePath, '.ts');
    const dirPath = path.dirname(relativePath);
    
    switch (category) {
      case 'unit':
        return path.join(this.testRoot, 'jest', 'unit', dirPath, baseName + '.spec.ts');
      case 'integration':
        return path.join(this.testRoot, 'jest', 'integration', dirPath, baseName + '.integration.test.ts');
      case 'e2e':
        return path.join(this.testRoot, 'jest', 'e2e', dirPath, baseName + '.e2e.test.ts');
      case 'security':
        return path.join(this.testRoot, 'jest', 'security', dirPath, baseName + '.security.test.ts');
      case 'k6':
        return path.join(this.testRoot, 'k6', dirPath, baseName + '.perf.test.js');
      default:
        return path.join(this.testRoot, 'jest', 'unit', dirPath, baseName + '.spec.ts');
    }
  }

  /**
   * 检查测试类型是否与源文件类型兼容
   */
  private isTestTypeCompatible(testType: string, srcFileType: string): boolean {
    // 单元测试适合所有源文件类型
    if (testType === 'unit') return true;
    
    // 集成测试更适合服务、存储库和控制器
    if (testType === 'integration' && 
        (srcFileType === 'core-logic' || srcFileType === 'utility')) {
      return true;
    }
    
    // E2E测试主要针对控制器和API端点
    if (testType === 'e2e' && srcFileType === 'core-logic') {
      return true;
    }
    
    // 安全测试针对暴露API的文件
    if (testType === 'security' && srcFileType === 'core-logic') {
      return true;
    }
    
    return false;
  }

  /**
   * 计算字符串相似度 (Levenshtein Distance)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;

    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,     // deletion
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 检查文件模式匹配
   */
  private checkFilePatternMatch(testName: string, srcName: string): { isMatch: boolean; pattern: string } {
    const patterns = [
      { pattern: 'service', regex: /service/i },
      { pattern: 'controller', regex: /controller/i },
      { pattern: 'repository', regex: /repository/i },
      { pattern: 'guard', regex: /guard/i },
      { pattern: 'interceptor', regex: /interceptor/i },
      { pattern: 'middleware', regex: /middleware/i },
      { pattern: 'util', regex: /util/i },
      { pattern: 'helper', regex: /helper/i }
    ];

    for (const { pattern, regex } of patterns) {
      if (regex.test(testName) && regex.test(srcName)) {
        return { isMatch: true, pattern };
      }
    }

    return { isMatch: false, pattern: '' };
  }

  /**
   * 计算目录相似度
   */
  private calculateDirectorySimilarity(testDir: string, srcDir: string): number {
    if (testDir === srcDir) return 1.0;
    
    const testParts = testDir.split('/').filter(p => p);
    const srcParts = srcDir.split('/').filter(p => p);
    
    if (testParts.length === 0 && srcParts.length === 0) return 1.0;
    if (testParts.length === 0 || srcParts.length === 0) return 0.1;

    const maxLength = Math.max(testParts.length, srcParts.length);
    let matchingParts = 0;

    // 计算匹配的目录层级
    for (let i = 0; i < Math.min(testParts.length, srcParts.length); i++) {
      if (testParts[i] === srcParts[i]) {
        matchingParts++;
      } else {
        break; // 一旦不匹配就停止
      }
    }

    // 考虑core目录的特殊映射
    if (this.isValidDirectoryMapping(srcDir, testDir)) {
      return Math.max(0.8, matchingParts / maxLength);
    }

    return matchingParts / maxLength;
  }

  private getRelativeDirectory(filePath: string, rootPath: string): string {
    const relativePath = path.relative(rootPath, filePath);
    return path.dirname(relativePath);
  }

  private isValidDirectoryMapping(srcDir: string, testDir: string): boolean {
    // 精确匹配
    if (srcDir === testDir) return true;
    
    // 处理 core 目录映射
    if (srcDir.includes('/core/') && testDir === srcDir.replace('/core/', '/')) return true;
    if (testDir.includes('/core/') && srcDir === testDir.replace('/core/', '/')) return true;
    
    return false;
  }

  private generateExpectedTestPath(srcFile: string): string {
    const relativePath = path.relative(this.srcRoot, srcFile);
    const baseName = path.basename(relativePath, '.ts');
    const dirPath = path.dirname(relativePath);
    
    return path.join(this.testRoot, 'jest', 'unit', dirPath, baseName + '.spec.ts');
  }

  private isConfigOrUtilFile(testFile: string): boolean {
    const configPatterns = [
      /\/config\//,
      /\/utils\//,
      /\/fixtures\//,
      /\/setup/,
      /\.config\./,
      /\.setup\./
    ];
    
    return configPatterns.some(pattern => pattern.test(testFile));
  }

  private determineTestType(testFile: string): string {
    if (testFile.includes('/unit/')) return 'unit';
    if (testFile.includes('/integration/')) return 'integration';
    if (testFile.includes('/e2e/')) return 'e2e';
    if (testFile.includes('/security/')) return 'security';
    if (testFile.includes('/k6/')) return 'performance';
    return 'unknown';
  }

  private analyzeSourceFileType(srcFile: string): { needsTest: boolean; type: string; priority: string } {
    const fileName = path.basename(srcFile, '.ts');
    const dirPath = path.dirname(srcFile);
    
    // 不需要测试的文件类型
    const noTestNeeded = [
      /\.d$/,           // 类型定义文件
      /^index$/,        // 索引文件
      /^main$/,         // 主入口文件
      /\.module$/,      // 模块文件
      /\.config$/,      // 配置文件
      /\.constants$/,   // 常量文件
      /\.enum$/,        // 枚举文件
      /\.interface$/,   // 接口文件
      /\.types$/        // 类型文件
    ];
    
    if (noTestNeeded.some(pattern => pattern.test(fileName))) {
      return { needsTest: false, type: 'config', priority: 'none' };
    }
    
    // 高优先级需要测试的文件
    const highPriorityPatterns = [
      /\.service$/,
      /\.controller$/,
      /\.repository$/,
      /\.guard$/,
      /\.interceptor$/,
      /\.middleware$/
    ];
    
    if (highPriorityPatterns.some(pattern => pattern.test(fileName))) {
      return { needsTest: true, type: 'core-logic', priority: 'high' };
    }
    
    // 中优先级
    if (fileName.includes('util') || fileName.includes('helper')) {
      return { needsTest: true, type: 'utility', priority: 'medium' };
    }
    
    // 低优先级
    if (dirPath.includes('/dto/') || dirPath.includes('/schemas/')) {
      return { needsTest: true, type: 'data-structure', priority: 'low' };
    }
    
    // 默认需要测试
    return { needsTest: true, type: 'core-logic', priority: 'medium' };
  }

  private findAnyMatchingTestFile(srcFile: string): string | null {
    if (!this.testStructure) return null;

    const srcBaseName = path.basename(srcFile, '.ts');
    
    for (const testFile of this.testStructure.allTestFiles) {
      const testBaseName = this.extractCoreFileName(path.basename(testFile));
      
      if (testBaseName === srcBaseName) {
        return testFile;
      }
    }
    
    return null;
  }

  private extractCoreFileName(fileName: string): string {
    // 移除测试文件的扩展名
    let coreName = fileName
      .replace(/\.spec\.ts$/, '')
      .replace(/\.integration\.test\.ts$/, '')
      .replace(/\.e2e\.test\.ts$/, '')
      .replace(/\.security\.test\.ts$/, '')
      .replace(/\.perf\.test\.js$/, '')
      .replace(/\.test\.ts$/, '')
      .replace(/\.test\.js$/, '');
    
    return coreName;
  }

  /**
   * 判断测试文件是否应该被排除在孤立文件检查之外
   * 主要用于排除特殊用途的性能测试文件和黑盒测试文件
   */
  private shouldExcludeTestFile(testFile: string): boolean {
    // 1. 排除k6性能测试文件 - 这些文件有特殊用途，不需要直接对应源文件
    if (testFile.includes('/k6/')) {
      // 检查是否在性能测试的特定子目录下
      const perfTestDirs = [
        '/k6/load/',
        '/k6/stress/',
        '/k6/spike/',
        '/k6/security/'
      ];
      
      if (perfTestDirs.some(dir => testFile.includes(dir))) {
        return true;
      }
      
      // 检查文件名是否包含特定性能测试关键词
      const fileName = path.basename(testFile).toLowerCase();
      const perfKeywords = ['load', 'stress', 'spike', 'volume', 'perf', 'performance'];
      if (perfKeywords.some(keyword => fileName.includes(keyword))) {
        return true;
      }
    }
    
    // 2. 排除blackbox目录下的测试文件 - 这些是特殊的黑盒端到端测试
    if (testFile.includes('/blackbox/')) {
      return true;
    }
    
    // 3. 检查文件名中是否包含blackbox关键词
    const fileName = path.basename(testFile).toLowerCase();
    if (fileName.includes('blackbox')) {
      return true;
    }
    
    return false;
  }

  private buildRepairScript(plan: RepairPlan): string {
    const script = [
      "#!/bin/bash",
      "# 测试结构自动修复脚本 - 按阶段执行",
      "# 由 TestStructureValidator 自动生成",
      "",
      "set -e  # 遇到错误时停止执行",
      "",
      "echo '🔧 开始测试结构修复...'",
      "",
      `echo '📊 修复摘要:'`,
      `echo '   - 文件命名问题: ${plan.summary.fileNamingIssues} 个'`,
      `echo '   - 目录不匹配: ${plan.summary.directoryMismatches} 个'`,
      `echo '   - 真正孤立文件: ${plan.summary.orphanedTestFiles} 个'`, 
      `echo '   - 潜在匹配文件: ${plan.summary.potentialMatches} 个'`,
      `echo '   - 缺失测试文件: ${plan.summary.missingTestFiles} 个'`,
      `echo '   - 目录结构问题: ${plan.summary.directoryStructureIssues} 个'`,
      `echo '   - 总计需修复问题: ${plan.summary.totalIssues} 个'`,
      "",
      "# 确认是否执行修复",
      "read -p \"确认执行修复操作? (y/n): \" confirm",
      "if [[ $confirm != \"y\" ]]; then",
      "  echo \"已取消修复操作\"",
      "  exit 0",
      "fi",
      "",
      "echo '备份当前文件...'",
      "timestamp=$(date +\"%Y%m%d_%H%M%S\")",
      "backup_dir=\"test-structure-backup-${timestamp}\"",
      "mkdir -p \"${backup_dir}\"",
      ""
    ];

    // 按阶段分组操作
    const phase1CreateDirs = plan.actions.filter(a => a.phase === '1-create-dirs');
    const phase2RenameFiles = plan.actions.filter(a => a.phase === '2-rename-files');
    const phase3MoveFiles = plan.actions.filter(a => a.phase === '3-move-files');
    const phase4IntelligentMove = plan.actions.filter(a => a.phase === '4-intelligent-move');
    const phase5CreateFiles = plan.actions.filter(a => a.phase === '5-create-files');
    const phase6DeleteOrphanedFiles = plan.actions.filter(a => a.phase === '6-delete-orphaned-files');
    const phase7CleanupEmptyDirs = plan.actions.filter(a => a.phase === '7-cleanup-empty-dirs');

    // 阶段1: 创建缺失的目录结构
    if (phase1CreateDirs.length > 0) {
      script.push("echo '📁 [阶段1] 创建缺失的目录结构...'");
      phase1CreateDirs.forEach(action => {
        script.push(`echo '  ${action.description}'`);
        script.push(action.command);
      });
      script.push("echo '✅ 阶段1 完成: 目录结构已创建'");
      script.push("");
    }

    // 阶段2: 文件重命名
    if (phase2RenameFiles.length > 0) {
      script.push("echo '🏷️  [阶段2] 执行文件重命名操作...'");
      script.push("mkdir -p \"${backup_dir}/phase2-renames\"");
      
      phase2RenameFiles.forEach(action => {
        const cmdParts = action.command.split(' ');
        const origPath = cmdParts.length > 1 ? cmdParts[1].replace(/"/g, '') : '';
        const fileName = path.basename(origPath || 'unknown');
        
        script.push(`echo '  ${action.description}'`);
        if (origPath) {
          script.push(`cp "${origPath}" "\${backup_dir}/phase2-renames/${fileName}" 2>/dev/null || true`);
        }
        script.push(action.command);
      });
      script.push("echo '✅ 阶段2 完成: 文件重命名完成'");
      script.push("");
    }

    // 阶段3: 移动测试文件到正确目录
    if (phase3MoveFiles.length > 0) {
      script.push("echo '📂 [阶段3] 移动测试文件到正确目录...'");
      script.push("mkdir -p \"${backup_dir}/phase3-moves\"");
      
      phase3MoveFiles.forEach(action => {
        script.push(`echo '  ${action.description}'`);
        // 提取原始路径进行备份
        const origPathMatch = action.description.match(/移动测试文件到正确目录: (.+?) →/);
        if (origPathMatch) {
          const origPath = origPathMatch[1];
          const fileName = path.basename(origPath);
          script.push(`cp "${origPath}" "\${backup_dir}/phase3-moves/${fileName}" 2>/dev/null || true`);
        }
        script.push(action.command);
      });
      script.push("echo '✅ 阶段3 完成: 测试文件移动完成'");
      script.push("");
    }

    // 阶段4: 智能匹配处理
    if (phase4IntelligentMove.length > 0) {
      script.push("echo '🔄 [阶段4] 执行智能匹配处理...'");
      script.push("mkdir -p \"${backup_dir}/phase4-intelligent-matches\"");
      
      const highConfidence = phase4IntelligentMove.filter(a => a.priority === 'high');
      const mediumConfidence = phase4IntelligentMove.filter(a => a.priority === 'medium');
      const lowConfidence = phase4IntelligentMove.filter(a => a.priority === 'low');
      
      if (highConfidence.length > 0) {
        script.push("echo '  ⭐ 高置信度匹配 (>80%)...'");
        highConfidence.forEach(action => {
          script.push(`echo '    ${action.description}'`);
          script.push(action.command);
        });
      }
      
      if (mediumConfidence.length > 0) {
        script.push("echo '  ✓ 中置信度匹配 (50-80%)...'");
        mediumConfidence.forEach(action => {
          script.push(`echo '    ${action.description}'`);
          script.push(action.command);
        });
      }
      
      if (lowConfidence.length > 0) {
        script.push("echo '  ❓ 低置信度匹配 (<50%)...'");
        script.push("read -p \"是否处理低置信度匹配? (y/n): \" process_low");
        script.push("if [[ $process_low == \"y\" ]]; then");
        lowConfidence.forEach(action => {
          script.push(`  echo '    ${action.description}'`);
          script.push(`  ${action.command}`);
        });
        script.push("else");
        script.push("  echo '  跳过低置信度匹配'");
        script.push("fi");
      }
      
      script.push("echo '✅ 阶段4 完成: 智能匹配处理完成'");
      script.push("");
    }

    // 阶段5: 创建缺失测试文件
    if (phase5CreateFiles.length > 0) {
      script.push("echo '✨ [阶段5] 创建缺失测试文件...'");
      phase5CreateFiles.forEach(action => {
        script.push(`echo '  ${action.description}'`);
        script.push(action.command);
      });
      script.push("echo '✅ 阶段5 完成: 缺失测试文件已创建'");
      script.push("");
    }

    // 阶段6: 删除孤立测试文件
    if (phase6DeleteOrphanedFiles.length > 0) {
      script.push("echo '🗑️  [阶段6] 处理孤立测试文件...'");
      script.push("mkdir -p \"${backup_dir}/phase6-orphaned\"");
      script.push("read -p \"确认删除孤立测试文件? (y/n): \" delete_orphaned");
      script.push("if [[ $delete_orphaned == \"y\" ]]; then");
      
      phase6DeleteOrphanedFiles.forEach(action => {
        const filePathMatch = action.description.match(/删除孤立测试文件: (.+?) \(/);
        if (filePathMatch) {
          const filePath = filePathMatch[1];
          const fileName = path.basename(filePath);
          script.push(`  echo '  ${action.description}'`);
          script.push(`  cp "${filePath}" "\${backup_dir}/phase6-orphaned/${fileName}" 2>/dev/null || true`);
          script.push(`  ${action.command}`);
        }
      });
      
      script.push("else");
      script.push("  echo '  跳过删除孤立文件'");
      script.push("fi");
      script.push("echo '✅ 阶段6 完成: 孤立文件处理完成'");
      script.push("");
    }

    // 阶段7: 清理空的冗余目录
    if (phase7CleanupEmptyDirs.length > 0) {
      script.push("echo '🧹 [阶段7] 清理空的冗余目录...'");
      phase7CleanupEmptyDirs.forEach(action => {
        script.push(`echo '  ${action.description}'`);
        // 执行安全的空目录检查和删除
        const commands = action.command.split('\\n');
        commands.forEach(cmd => {
          if (cmd.trim()) {
            script.push(cmd);
          }
        });
      });
      script.push("echo '✅ 阶段7 完成: 空目录清理完成'");
      script.push("");
    }

    script.push("echo '🎉 所有阶段修复完成!'");
    script.push("echo '💡 备份已保存到 ${backup_dir} 目录'");
    script.push("echo '🔍 建议运行验证确认修复结果：bun run test:validate-structure'");
    script.push("");
    
    // 询问是否删除脚本
    script.push("read -p \"是否删除此修复脚本? (y/n): \" delete_script");
    script.push("if [[ $delete_script == \"y\" ]]; then");
    script.push("  rm \"$0\"");
    script.push("  echo \"脚本已删除\"");
    script.push("else");
    script.push("  echo \"保留脚本文件\"");
    script.push("fi");

    return script.join("\n");
  }

  /**
   * 创建安全的移动命令，确保目标目录存在
   * @param origPath 源文件路径
   * @param destPath 目标文件路径
   * @param indentation 缩进字符串
   * @returns 安全的shell命令数组
   */
  private createSafeMoveCommand(origPath: string, destPath: string, indentation: string = ''): string[] {
    const commands: string[] = [];
    const destDir = path.dirname(destPath);
    
    // 创建目录命令
    commands.push(`${indentation}# 确保目标目录存在`);
    commands.push(`${indentation}mkdir -p "${destDir}"`);
    
    // 检查源文件是否存在
    commands.push(`${indentation}if [ -f "${origPath}" ]; then`);
    
    // 检查目标文件是否已经存在
    commands.push(`${indentation}  if [ -f "${destPath}" ]; then`);
    commands.push(`${indentation}    echo "⚠️  目标文件已存在: ${destPath}，将源文件重命名为备用名称"`);
    commands.push(`${indentation}    mv "${origPath}" "${destPath}.bak-$(date +%s)"`);
    commands.push(`${indentation}  else`);
    commands.push(`${indentation}    mv "${origPath}" "${destPath}"`);
    commands.push(`${indentation}  fi`);
    commands.push(`${indentation}else`);
    commands.push(`${indentation}  echo "❌ 源文件不存在: ${origPath}"`);
    commands.push(`${indentation}fi`);
    
    return commands;
  }

  /**
   * 验证两个文件路径是否在同一测试类别内
   * 用于确保不发生跨测试类别的移动操作
   */
  private validateSameTestCategory(path1: string, path2: string): boolean {
    const category1 = this.determineTestCategory(path1);
    const category2 = this.determineTestCategory(path2);
    
    // 如果任一路径的类别未知，无法验证
    if (category1 === 'unknown' || category2 === 'unknown') {
      return false;
    }
    
    // 验证是否是相同的测试类别
    return category1 === category2;
  }
}

// ========== 类型定义 ==========

interface ProjectStructure {
  srcRoot: string;
  testRoot: string;
  srcFiles: string[];
  testFiles: string[];
  srcDirectories: string[];
  testDirectories: string[];
}

interface TestStructure {
  allTestFiles: string[];
  unitTestFiles: string[];
  integrationTestFiles: string[];
  e2eTestFiles: string[];
  securityTestFiles: string[];
  perfTestFiles: string[];
  testDirectories: string[];
}

interface FileNamingIssue {
  file: string;
  reason: string;
  expectedPattern: string;
  actualName: string;
}

interface RenameCommand {
  originalPath: string;
  suggestedPath: string;
  reason: string;
  command: string;
}

interface FileNamingResult {
  issues: FileNamingIssue[];
  renameCommands: RenameCommand[];
  summary: string;
}

interface DirectoryMismatch {
  testFile: string;
  sourceFile: string;
  testDirectory: string;
  sourceDirectory: string;
  expectedTestPath: string;
  severity: 'warning' | 'error';
}

interface OrphanedTestFile {
  testFile: string;
  reason: string;
  testType: string;
  suggestedAction: string;
}

interface MissingTestFile {
  sourceFile: string;
  expectedTestPath: string;
  sourceFileType: string;
  priority: string;
  existingTestFile: string | null;
  suggestedAction: string;
}

interface RepairAction {
  type: 'rename' | 'move' | 'delete' | 'create';
  description: string;
  command: string;
  priority: 'high' | 'medium' | 'low';
  risk: 'low' | 'medium' | 'high';
  phase?: string; // 修复阶段标识
}

interface RepairPlan {
  summary: {
    fileNamingIssues: number;
    directoryMismatches: number;
    orphanedTestFiles: number;
    potentialMatches: number;
    missingTestFiles: number;
    directoryStructureIssues: number;
    totalIssues: number;
  };
  actions: RepairAction[];
  commands: string[];
  estimatedTime: string;
}

interface ValidationResults {
  fileNamingIssues: FileNamingIssue[];
  directoryMismatches: DirectoryMismatch[];
  orphanedTestFiles: OrphanedTestFile[];
  missingTestFiles: MissingTestFile[];
  potentialMatches: PotentialMatch[];
  repairPlan: RepairPlan | null;
  directoryComparison: DirectoryComparisonResult | null;
}

interface PotentialMatch {
  testFile: string;
  sourceFile: string;
  confidence: number;
  reason: string;
  suggestedAction: string;
}

interface IntelligentMatch {
  sourceFile: string;
  confidence: number;
  reason: string;
  suggestedFix: string;
  targetCategory: string; // 保存匹配的测试类别
}

interface ValidationSummary {
  executionTime: string;
  projectStructure: ProjectStructure;
  testStructure: TestStructure;
  namingResult: FileNamingResult;
  directoryMismatches: DirectoryMismatch[];
  orphanedFiles: OrphanedTestFile[];
  missingFiles: MissingTestFile[];
  repairPlan: RepairPlan;
  recommendations: string[];
  directoryComparisonResult: DirectoryComparisonResult;
}

interface DirectoryComparisonResult {
  [key: string]: { missing: string[]; orphaned: string[] };
}

// ========== 便捷函数 ==========

/**
 * 快速执行完整验证
 */
export async function runCompleteValidation(): Promise<ValidationSummary> {
  const validator = new TestStructureValidator();
  return await validator.executeFullValidation();
}

/**
 * 快速生成修复脚本
 */
export async function generateQuickRepairScript(outputPath: string = "test-structure-repair.sh"): Promise<string> {
  const validator = new TestStructureValidator();
  await validator.executeFullValidation();
  const scriptPath = await validator.generateRepairScript(outputPath);
  
  console.log("\n📝 修复脚本已生成!");
  console.log(`📄 脚本路径: ${scriptPath}`);
  console.log("⚠️  请在执行前检查脚本内容，确保操作无误");
  console.log("🔧 执行方法:");
  console.log(`   chmod +x ${scriptPath}`);
  console.log(`   ./${scriptPath}`);
  console.log("✅ 执行完成后，请运行 'bun test:validate-structure' 再次验证");
  
  return scriptPath;
}

/**
 * 打印详细的测试文件列表(智能匹配、孤立、缺失)
 */
export async function printDetailedLists(): Promise<void> {
  const validator = new TestStructureValidator();
  
  console.log("🔍 扫描测试结构并分析问题...");
  await validator.executeFullValidation();
  
  console.log("\n📋 详细测试文件列表");
  console.log("=" .repeat(60));
  validator.printDetailedFileLists();
  
  console.log("\n💡 后续操作:");
  console.log("  1. 生成修复脚本: bun run test:validate-structure:repair");
  console.log("  2. 执行修复脚本: bun run test:validate-structure:apply");
  console.log("  3. 重新验证结构: bun run test:validate-structure");
}

// 如果直接运行此文件
if (require.main === module) {
  runCompleteValidation()
    .then(summary => {
      const totalIssues = summary.repairPlan.summary.totalIssues;
      if (totalIssues > 0) {
        console.log("\n需要修复的问题:");
        console.log(`🗑️  孤立测试文件: ${summary.repairPlan.summary.orphanedTestFiles} 个`);
        console.log(`🔄 智能匹配文件: ${summary.repairPlan.summary.potentialMatches} 个`);
        console.log(`✨ 缺失测试文件: ${summary.repairPlan.summary.missingTestFiles} 个`);
        console.log("\n生成修复脚本，执行下面的命令:");
        console.log("bun run node -e \"require('./test/utils/test-structure-validator').generateQuickRepairScript()\"");
      }
      
      if (summary.directoryComparisonResult) {
        console.log("\n\n📁 目录结构对比:");
        for (const [category, result] of Object.entries(summary.directoryComparisonResult)) {
          console.log(`\n--- ${category} ---`);
          if (result.missing.length > 0) {
            console.log(`  ❌ test中缺失的目录: \n    - ${result.missing.join('\n    - ')}`);
          }
          if (result.orphaned.length > 0) {
            console.log(`  🗑️ test中多余的目录: \n    - ${result.orphaned.join('\n    - ')}`);
          }
          if (result.missing.length === 0 && result.orphaned.length === 0) {
            console.log("  ✅ 目录结构与src完全一致");
          }
        }
      }
    })
    .catch(console.error);
}