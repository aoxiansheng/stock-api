import fs from "fs";
import path from "path";

describe("shared 层架构边界守卫", () => {
  it("shared/types 不应直接依赖 prepare 层", () => {
    const targetFile = path.resolve(
      process.cwd(),
      "src/core/shared/types/field-naming.types.ts",
    );
    const content = fs.readFileSync(targetFile, "utf8");

    expect(content).not.toMatch(/from\s+["']@core\/00-prepare\//);
    expect(content).not.toMatch(/from\s+["'][^"']*00-prepare\//);
  });
});
