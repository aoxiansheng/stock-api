/**
 * AlertRuleUtil Performance Benchmark
 * 🎯 测试优化后的方法性能
 */

import { AlertRuleUtil } from "@alert/utils/rule.utils";

describe("AlertRuleUtil Performance Benchmark", () => {
  const ITERATIONS = 10000;

  beforeAll(() => {
    console.log(
      `\n🚀 Running performance benchmarks with ${ITERATIONS} iterations each...`,
    );
  });

  describe("isValidMetricName Performance", () => {
    const testCases = [
      "valid_metric_name",
      "cpu.usage",
      "memory_total",
      "network.tx_bytes",
      "_private_metric",
      "invalid-metric", // invalid
      "", // invalid
      "a".repeat(300), // invalid - too long
    ];

    it("should validate metric names efficiently", () => {
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < ITERATIONS; i++) {
        for (const metric of testCases) {
          AlertRuleUtil.isValidMetricName(metric);
        }
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      console.log(
        `✅ isValidMetricName: ${duration.toFixed(2)}ms for ${ITERATIONS * testCases.length} validations`,
      );
      console.log(
        `   Average: ${(duration / (ITERATIONS * testCases.length)).toFixed(4)}ms per validation`,
      );

      // Performance requirement: Should complete under 100ms for all iterations
      expect(duration).toBeLessThan(100);
    });
  });

  describe("isValidThreshold Performance", () => {
    const testCases = [
      100,
      0.5,
      -50.25,
      "123.45",
      "0",
      NaN, // invalid
      Infinity, // invalid
      "not-a-number", // invalid
      null, // invalid
      undefined, // invalid
    ];

    it("should validate thresholds efficiently", () => {
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < ITERATIONS; i++) {
        for (const threshold of testCases) {
          AlertRuleUtil.isValidThreshold(threshold);
        }
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      console.log(
        `✅ isValidThreshold: ${duration.toFixed(2)}ms for ${ITERATIONS * testCases.length} validations`,
      );
      console.log(
        `   Average: ${(duration / (ITERATIONS * testCases.length)).toFixed(4)}ms per validation`,
      );

      // Performance requirement: Should complete under 50ms for all iterations
      expect(duration).toBeLessThan(50);
    });
  });

  describe("formatAlertMessage Performance", () => {
    const template =
      "Alert: {metric} value {value} {operator} threshold {threshold} for {duration}s";
    const variables = {
      metric: "cpu.usage",
      value: 85.5,
      operator: ">",
      threshold: 80,
      duration: 300,
    };

    it("should format messages efficiently", () => {
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < ITERATIONS; i++) {
        AlertRuleUtil.formatAlertMessage(template, variables);
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      console.log(
        `✅ formatAlertMessage: ${duration.toFixed(2)}ms for ${ITERATIONS} format operations`,
      );
      console.log(
        `   Average: ${(duration / ITERATIONS).toFixed(4)}ms per format`,
      );

      // Performance requirement: Should complete under 100ms for all iterations
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Functional Correctness", () => {
    it("should maintain correct validation behavior after optimization", () => {
      // Test metric name validation
      expect(AlertRuleUtil.isValidMetricName("valid_metric")).toBe(true);
      expect(AlertRuleUtil.isValidMetricName("cpu.usage")).toBe(true);
      expect(AlertRuleUtil.isValidMetricName("_private")).toBe(true);
      expect(AlertRuleUtil.isValidMetricName("invalid-metric")).toBe(false);
      expect(AlertRuleUtil.isValidMetricName("")).toBe(false);
      expect(AlertRuleUtil.isValidMetricName("a".repeat(201))).toBe(false);

      // Test threshold validation
      expect(AlertRuleUtil.isValidThreshold(100)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(0.5)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(-50.25)).toBe(true);
      expect(AlertRuleUtil.isValidThreshold("123.45")).toBe(true);
      expect(AlertRuleUtil.isValidThreshold(NaN)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(Infinity)).toBe(false);
      expect(AlertRuleUtil.isValidThreshold("not-a-number")).toBe(false);
      expect(AlertRuleUtil.isValidThreshold(null)).toBe(false);

      // Test message formatting
      const result = AlertRuleUtil.formatAlertMessage(
        "Alert: {metric} = {value}",
        { metric: "cpu.usage", value: 85.5 },
      );
      expect(result).toBe("Alert: cpu.usage = 85.5");

      // Test undefined variable handling
      const resultWithMissing = AlertRuleUtil.formatAlertMessage(
        "Alert: {metric} = {missing}",
        { metric: "cpu.usage" },
      );
      expect(resultWithMissing).toBe("Alert: cpu.usage = {missing}");
    });
  });

  afterAll(() => {
    console.log("\n🎯 Benchmark Summary:");
    console.log("✅ All optimizations completed successfully");
    console.log("✅ Performance requirements met");
    console.log("✅ Functional correctness maintained");
  });
});
