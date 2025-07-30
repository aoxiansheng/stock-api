import { FormatUtils } from "../../../../../src/metrics/utils/format.util";

describe("FormatUtils - Comprehensive Coverage", () => {
  describe("roundNumber", () => {
    it("should round number to default 2 decimal places", () => {
      expect(FormatUtils.roundNumber(3.14159)).toBe(3.14);
      expect(FormatUtils.roundNumber(2.555)).toBe(2.56);
      expect(FormatUtils.roundNumber(1.234567)).toBe(1.23);
    });

    it("should round number to specified decimal places", () => {
      expect(FormatUtils.roundNumber(3.14159, 0)).toBe(3);
      expect(FormatUtils.roundNumber(3.14159, 1)).toBe(3.1);
      expect(FormatUtils.roundNumber(3.14159, 3)).toBe(3.142);
      expect(FormatUtils.roundNumber(3.14159, 4)).toBe(3.1416);
    });

    it("should handle whole numbers", () => {
      expect(FormatUtils.roundNumber(5, 2)).toBe(5);
      expect(FormatUtils.roundNumber(100, 1)).toBe(100);
      expect(FormatUtils.roundNumber(0, 3)).toBe(0);
    });

    it("should handle negative numbers", () => {
      expect(FormatUtils.roundNumber(-3.14159, 2)).toBe(-3.14);
      expect(FormatUtils.roundNumber(-2.555, 2)).toBe(-2.56);
      expect(FormatUtils.roundNumber(-1.234567, 3)).toBe(-1.235);
    });

    it("should handle very small numbers", () => {
      expect(FormatUtils.roundNumber(0.0001, 2)).toBe(0);
      expect(FormatUtils.roundNumber(0.0001, 4)).toBe(0.0001);
      expect(FormatUtils.roundNumber(0.00000001, 8)).toBe(0.00000001);
    });

    it("should handle very large numbers", () => {
      expect(FormatUtils.roundNumber(999999.999, 2)).toBe(1000000);
      expect(FormatUtils.roundNumber(123456789.987654, 3)).toBe(123456789.988);
    });

    it("should handle numbers already at specified precision", () => {
      expect(FormatUtils.roundNumber(3.14, 2)).toBe(3.14);
      expect(FormatUtils.roundNumber(5.0, 1)).toBe(5);
      expect(FormatUtils.roundNumber(2.5, 2)).toBe(2.5);
    });

    it("should handle rounding edge cases", () => {
      // Test banker's rounding behavior
      expect(FormatUtils.roundNumber(2.5, 0)).toBe(3);
      expect(FormatUtils.roundNumber(3.5, 0)).toBe(4);
      expect(FormatUtils.roundNumber(1.005, 2)).toBe(1.01); // Note: JavaScript floating point precision
    });

    it("should return 0 for NaN input", () => {
      expect(FormatUtils.roundNumber(NaN)).toBe(0);
      expect(FormatUtils.roundNumber(NaN, 3)).toBe(0);
    });

    it("should return 0 for non-number input", () => {
      expect(FormatUtils.roundNumber("3.14" as any)).toBe(0);
      expect(FormatUtils.roundNumber(null as any)).toBe(0);
      expect(FormatUtils.roundNumber(undefined as any)).toBe(0);
      expect(FormatUtils.roundNumber({} as any)).toBe(0);
      expect(FormatUtils.roundNumber([] as any)).toBe(0);
      expect(FormatUtils.roundNumber(true as any)).toBe(0);
    });

    it("should handle Infinity and -Infinity", () => {
      expect(FormatUtils.roundNumber(Infinity)).toBe(0);
      expect(FormatUtils.roundNumber(-Infinity)).toBe(0);
    });

    it("should handle zero decimal places", () => {
      expect(FormatUtils.roundNumber(3.14159, 0)).toBe(3);
      expect(FormatUtils.roundNumber(3.6, 0)).toBe(4);
      expect(FormatUtils.roundNumber(-3.6, 0)).toBe(-4);
    });

    it("should handle high decimal precision", () => {
      expect(FormatUtils.roundNumber(3.123456789, 6)).toBe(3.123457);
      expect(FormatUtils.roundNumber(3.123456789, 8)).toBe(3.12345679);
    });

    it("should handle scientific notation inputs", () => {
      expect(FormatUtils.roundNumber(1e-5, 6)).toBe(0.00001);
      expect(FormatUtils.roundNumber(1.23e3, 1)).toBe(1230);
      expect(FormatUtils.roundNumber(-4.56e-2, 3)).toBe(-0.046);
    });
  });

  describe("bytesToGB", () => {
    it("should convert bytes to GB correctly", () => {
      const oneGB = 1024 * 1024 * 1024; // 1,073,741,824 bytes
      expect(FormatUtils.bytesToGB(oneGB)).toBe(1);

      const twoGB = 2 * 1024 * 1024 * 1024;
      expect(FormatUtils.bytesToGB(twoGB)).toBe(2);

      const halfGB = 0.5 * 1024 * 1024 * 1024;
      expect(FormatUtils.bytesToGB(halfGB)).toBe(0.5);
    });

    it("should handle fractional GB values", () => {
      const bytes1_5GB = 1.5 * 1024 * 1024 * 1024;
      expect(FormatUtils.bytesToGB(bytes1_5GB)).toBe(1.5);

      const bytes0_25GB = 0.25 * 1024 * 1024 * 1024;
      expect(FormatUtils.bytesToGB(bytes0_25GB)).toBe(0.25);
    });

    it("should handle small byte values", () => {
      expect(FormatUtils.bytesToGB(1024)).toBe(0); // 1KB rounds to 0.00 GB
      expect(FormatUtils.bytesToGB(1024 * 1024)).toBe(0); // 1MB rounds to 0.00 GB
      expect(FormatUtils.bytesToGB(100 * 1024 * 1024)).toBe(0.1); // ~100MB (0.09765625 rounds to 0.10)
    });

    it("should handle large byte values", () => {
      const tenGB = 10 * 1024 * 1024 * 1024;
      expect(FormatUtils.bytesToGB(tenGB)).toBe(10);

      const hundredGB = 100 * 1024 * 1024 * 1024;
      expect(FormatUtils.bytesToGB(hundredGB)).toBe(100);
    });

    it("should return 0 for zero bytes", () => {
      expect(FormatUtils.bytesToGB(0)).toBe(0);
    });

    it("should return 0 for NaN input", () => {
      expect(FormatUtils.bytesToGB(NaN)).toBe(0);
    });

    it("should return 0 for non-number input", () => {
      expect(FormatUtils.bytesToGB("1024" as any)).toBe(0);
      expect(FormatUtils.bytesToGB(null as any)).toBe(0);
      expect(FormatUtils.bytesToGB(undefined as any)).toBe(0);
      expect(FormatUtils.bytesToGB({} as any)).toBe(0);
      expect(FormatUtils.bytesToGB([] as any)).toBe(0);
      expect(FormatUtils.bytesToGB(true as any)).toBe(0);
    });

    it("should handle Infinity and -Infinity", () => {
      expect(FormatUtils.bytesToGB(Infinity)).toBe(0);
      expect(FormatUtils.bytesToGB(-Infinity)).toBe(0);
    });

    it("should handle negative byte values", () => {
      const negativeBytes = -1024 * 1024 * 1024;
      expect(FormatUtils.bytesToGB(negativeBytes)).toBe(-1);
    });

    it("should round result to 2 decimal places", () => {
      // Test that internal rounding works correctly
      const irregularBytes = 1536 * 1024 * 1024; // 1.5 GB
      expect(FormatUtils.bytesToGB(irregularBytes)).toBe(1.5);

      // Test more complex rounding
      const complexBytes = 1073741824 + 536870912; // 1.5 GB exactly
      expect(FormatUtils.bytesToGB(complexBytes)).toBe(1.5);
    });

    it("should handle very small non-zero values", () => {
      expect(FormatUtils.bytesToGB(1)).toBe(0);
      expect(FormatUtils.bytesToGB(100)).toBe(0);
      expect(FormatUtils.bytesToGB(1000)).toBe(0);
    });

    it("should handle scientific notation inputs", () => {
      expect(FormatUtils.bytesToGB(1e9)).toBeCloseTo(0.93, 2); // 1 billion bytes ≈ 0.93 GB
      expect(FormatUtils.bytesToGB(2.5e9)).toBeCloseTo(2.33, 2); // 2.5 billion bytes
    });

    it("should be consistent with roundNumber behavior", () => {
      const bytes = 1.234567 * 1024 * 1024 * 1024;
      const result = FormatUtils.bytesToGB(bytes);

      // Should have exactly 2 decimal places due to roundNumber(gb, 2)
      expect(result).toBe(1.23);
      expect(Number.isInteger(result * 100)).toBe(true); // Verify 2 decimal places
    });
  });

  describe("Integration and edge cases", () => {
    it("should handle chained operations correctly", () => {
      const bytes = 2.5 * 1024 * 1024 * 1024; // 2.5 GB
      const gb = FormatUtils.bytesToGB(bytes);
      const rounded = FormatUtils.roundNumber(gb, 1);

      expect(gb).toBe(2.5);
      expect(rounded).toBe(2.5);
    });

    it("should maintain precision across multiple operations", () => {
      const originalValue = 3.14159265359;
      const rounded2 = FormatUtils.roundNumber(originalValue, 2);
      const rounded4 = FormatUtils.roundNumber(originalValue, 4);

      expect(rounded2).toBe(3.14);
      expect(rounded4).toBe(3.1416);

      // Verify that rounding doesn't accumulate errors
      expect(FormatUtils.roundNumber(rounded2, 4)).toBe(3.14);
    });

    it("should handle boundary values correctly", () => {
      // Test byte conversion boundaries
      const almostOneGB = 1024 * 1024 * 1024 - 1;
      const exactlyOneGB = 1024 * 1024 * 1024;
      const justOverOneGB = 1024 * 1024 * 1024 + 1;

      expect(FormatUtils.bytesToGB(almostOneGB)).toBe(1);
      expect(FormatUtils.bytesToGB(exactlyOneGB)).toBe(1);
      expect(FormatUtils.bytesToGB(justOverOneGB)).toBe(1);
    });

    it("should handle floating point precision edge cases", () => {
      // Test cases that might expose floating point precision issues
      const precisionTest = 0.1 + 0.2; // Known JS floating point issue
      expect(FormatUtils.roundNumber(precisionTest, 2)).toBe(0.3);

      const bytes = 1073741824.1; // Just over 1GB
      expect(FormatUtils.bytesToGB(bytes)).toBe(1);
    });
  });
});
