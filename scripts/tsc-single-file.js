#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { resolve, dirname } = require('node:path');
const { writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');

function printUsageAndExit() {
  console.error('用法: node scripts/tsc-single-file.js <相对或绝对的TS文件路径> [--traceResolution] [--noEmit]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith('-')) {
  printUsageAndExit();
}
const fileArg = args[0];
const passThroughArgs = args.slice(1);

const backendDir = resolve(__dirname, '..');
const repoRoot = resolve(backendDir, '..');

const filePathAbs = resolve(process.cwd(), fileArg);

const tmpDir = mkdtempSync(resolve(os.tmpdir(), 'tsc-single-'));
const tmpTsconfigPath = resolve(tmpDir, 'tsconfig.json');

const baseConfigPath = resolve(backendDir, 'tsconfig.single.json');

const tmpTsconfig = {
  extends: baseConfigPath,
  files: [filePathAbs]
};

writeFileSync(tmpTsconfigPath, JSON.stringify(tmpTsconfig, null, 2));

const tscCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const tscArgs = ['tsc', '--noEmit', '-p', tmpTsconfigPath, ...passThroughArgs];

const env = { ...process.env };

const result = spawnSync(tscCmd, tscArgs, {
  cwd: backendDir,
  stdio: 'inherit',
  env
});

try { rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

process.exit(result.status ?? 1); 