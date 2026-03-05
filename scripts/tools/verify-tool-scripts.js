#!/usr/bin/env node
/* eslint-disable no-console */
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const projectRoot = resolve(__dirname, "..", "..");
const packageJsonPath = resolve(projectRoot, "package.json");

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const scripts = packageJson.scripts || {};

const missing = [];
for (const [name, command] of Object.entries(scripts)) {
  if (!name.startsWith("tool:")) {
    continue;
  }
  const match = String(command).match(/node\s+([^\s]+)/);
  if (!match) {
    continue;
  }
  const scriptPath = resolve(projectRoot, match[1]);
  if (!existsSync(scriptPath)) {
    missing.push({ name, path: match[1] });
  }
}

if (missing.length > 0) {
  console.error("检测到缺失的 tool 脚本文件:");
  for (const item of missing) {
    console.error(`- ${item.name}: ${item.path}`);
  }
  process.exit(1);
}

console.log("tool 脚本存在性检查通过");
