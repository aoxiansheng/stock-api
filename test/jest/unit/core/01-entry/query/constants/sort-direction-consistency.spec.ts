/**
 * 排序方向一致性自动化测试
 * 验证SortDirection枚举在整个Query模块中的一致使用
 */

import { SortDirection } from "../../../../../../src/core/01-entry/query/dto/query-request.dto";
import { SortConfigDto } from "../../../../../../src/core/01-entry/query/dto/query-internal.dto";

describe("Sort Direction Consistency", () => {
  describe("SortDirection Enum Values", () => {
    it("should have consistent enum values", () => {
      // 验证枚举值符合预期的字符串格式
      expect(SortDirection.ASC).toBe("asc");
      expect(SortDirection.DESC).toBe("desc");
    });

    it("should contain only expected values", () => {
      // 验证枚举只包含预期的两个值
      const enumValues = Object.values(SortDirection);
      expect(enumValues).toHaveLength(2);
      expect(enumValues).toContain("asc");
      expect(enumValues).toContain("desc");
    });

    it("should have case-insensitive consistency", () => {
      // 验证枚举值是小写，符合现代API惯例
      expect(SortDirection.ASC.toLowerCase()).toBe(SortDirection.ASC);
      expect(SortDirection.DESC.toLowerCase()).toBe(SortDirection.DESC);
    });
  });

  describe("SortConfigDto Consistency", () => {
    it("should accept SortDirection enum values", () => {
      // 验证SortConfigDto能正确使用SortDirection枚举
      const sortConfig = new SortConfigDto();
      sortConfig.field = "price";
      sortConfig.direction = SortDirection.ASC;

      expect(sortConfig.direction).toBe(SortDirection.ASC);
      expect(sortConfig.direction).toBe("asc");
    });

    it("should accept both enum directions", () => {
      // 验证两个枚举值都能正常使用
      const ascConfig = new SortConfigDto();
      ascConfig.field = "timestamp";
      ascConfig.direction = SortDirection.ASC;

      const descConfig = new SortConfigDto();
      descConfig.field = "volume";
      descConfig.direction = SortDirection.DESC;

      expect(ascConfig.direction).toBe("asc");
      expect(descConfig.direction).toBe("desc");
    });
  });

  describe("Cross-DTO Type Compatibility", () => {
    it("should maintain type compatibility across DTOs", () => {
      // 验证跨DTO的类型兼容性
      const querySort = {
        field: "price",
        direction: SortDirection.DESC
      };

      const sortConfig = new SortConfigDto();
      sortConfig.field = querySort.field;
      sortConfig.direction = querySort.direction;

      expect(sortConfig.direction).toBe(querySort.direction);
      expect(typeof sortConfig.direction).toBe("string");
    });
  });

  describe("Runtime Type Safety", () => {
    it("should maintain enum nature at runtime", () => {
      // 验证运行时的枚举特性
      expect(SortDirection).toHaveProperty("ASC");
      expect(SortDirection).toHaveProperty("DESC");
      
      // 验证反向查找
      const sortDirectionObj = SortDirection as any;
      expect(sortDirectionObj[sortDirectionObj.ASC]).toBe("ASC");
      expect(sortDirectionObj[sortDirectionObj.DESC]).toBe("DESC");
    });

    it("should prevent invalid assignments in TypeScript context", () => {
      // 这个测试主要验证TypeScript编译时类型检查
      // 在运行时我们验证正确的值类型
      const validDirections = [SortDirection.ASC, SortDirection.DESC];
      
      validDirections.forEach(direction => {
        const config = new SortConfigDto();
        config.direction = direction;
        expect(["asc", "desc"]).toContain(config.direction);
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain string value compatibility", () => {
      // 验证字符串值的向后兼容性，确保API响应格式不变
      const config = new SortConfigDto();
      config.direction = SortDirection.ASC;
      
      // JSON序列化后应该是字符串
      const serialized = JSON.stringify({ direction: config.direction });
      const parsed = JSON.parse(serialized);
      
      expect(parsed.direction).toBe("asc");
      expect(typeof parsed.direction).toBe("string");
    });

    it("should work in API response format", () => {
      // 模拟API响应格式
      const apiResponse = {
        sort: {
          field: "createdAt",
          direction: SortDirection.DESC
        }
      };

      expect(apiResponse.sort.direction).toBe("desc");
      
      // 验证能够通过字符串比较
      expect(apiResponse.sort.direction === "desc").toBe(true);
    });
  });
});