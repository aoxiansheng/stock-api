/* eslint-disable @typescript-eslint/no-unused-vars */
import { notificationConfig } from "../../../../../src/common/config/notification.config";

describe("NotificationConfig", () => {
  describe("default template", () => {
    it("should contain all required template variables", () => {
      const { defaultTemplate } = notificationConfig;

      const requiredVariables = [
        "{{ruleName}}",
        "{{metric}}",
        "{{value}}",
        "{{threshold}}",
        "{{severity}}",
        "{{status}}",
        "{{startTime}}",
        "{{duration}}",
        "{{message}}",
      ];

      requiredVariables.forEach((variable) => {
        expect(defaultTemplate).toContain(variable);
      });
    });

    it("should contain conditional tags section", () => {
      const { defaultTemplate } = notificationConfig;

      expect(defaultTemplate).toContain("{{#if tags}}");
      expect(defaultTemplate).toContain("{{{tags}}}");
      expect(defaultTemplate).toContain("{{/if}}");
    });

    it("should be properly trimmed", () => {
      const { defaultTemplate } = notificationConfig;

      // Should not start or end with whitespace
      expect(defaultTemplate).not.toMatch(/^\s/);
      expect(defaultTemplate).not.toMatch(/\s$/);
    });

    it("should have structured format", () => {
      const { defaultTemplate } = notificationConfig;

      // Should contain Chinese labels
      expect(defaultTemplate).toContain("告警详情:");
      expect(defaultTemplate).toContain("规则名称:");
      expect(defaultTemplate).toContain("监控指标:");
      expect(defaultTemplate).toContain("当前值:");
      expect(defaultTemplate).toContain("阈值:");
      expect(defaultTemplate).toContain("严重级别:");
      expect(defaultTemplate).toContain("状态:");
      expect(defaultTemplate).toContain("开始时间:");
      expect(defaultTemplate).toContain("持续时间:");
      expect(defaultTemplate).toContain("告警消息:");
      expect(defaultTemplate).toContain("标签:");
    });

    it("should have proper line structure", () => {
      const { defaultTemplate } = notificationConfig;
      const lines = defaultTemplate.split("\n");

      // Should have multiple lines
      expect(lines.length).toBeGreaterThan(10);

      // Each field line should start with dash
      const fieldLines = lines.filter(
        (line) => line.includes("{{") && line.includes("}}"),
      );
      fieldLines.forEach((line) => {
        if (
          !line.includes("{{#if") &&
          !line.includes("{{/if") &&
          !line.includes("{{{")
        ) {
          expect(line.trim()).toMatch(/^-/);
        }
      });
    });

    it("should use triple braces for unescaped tags", () => {
      const { defaultTemplate } = notificationConfig;

      // Tags should be unescaped to allow HTML/formatting
      expect(defaultTemplate).toContain("{{{tags}}}");
      // 修正测试逻辑：控制语句必须使用双括号，但输出变量应该使用三括号
      expect(defaultTemplate).not.toMatch(/标签: {{tags}}/);
    });
  });

  describe("email subject template", () => {
    it("should contain severity and status placeholders", () => {
      const { emailSubjectTemplate } = notificationConfig;

      expect(emailSubjectTemplate).toContain("{{severity}}");
      expect(emailSubjectTemplate).toContain("{{ruleName}}");
      expect(emailSubjectTemplate).toContain("{{status}}");
    });

    it("should have proper email subject format", () => {
      const { emailSubjectTemplate } = notificationConfig;

      // Should be concise for email subjects
      expect(emailSubjectTemplate.length).toBeLessThan(100);

      // Should have severity in brackets
      expect(emailSubjectTemplate).toMatch(/^\[{{severity}}\]/);

      // Should have dash separator
      expect(emailSubjectTemplate).toContain(" - ");
    });

    it("should be a single line", () => {
      const { emailSubjectTemplate } = notificationConfig;

      expect(emailSubjectTemplate).not.toContain("\n");
      expect(emailSubjectTemplate).not.toContain("\r");
    });

    it("should follow email subject best practices", () => {
      const { emailSubjectTemplate } = notificationConfig;

      // Should not be empty
      expect(emailSubjectTemplate.trim()).toBeTruthy();

      // Should not have leading/trailing whitespace
      expect(emailSubjectTemplate).toBe(emailSubjectTemplate.trim());
    });
  });

  describe("template validation", () => {
    it("should use handlebars syntax correctly", () => {
      const { defaultTemplate, emailSubjectTemplate } = notificationConfig;

      const templates = [defaultTemplate, emailSubjectTemplate];

      templates.forEach((template) => {
        // Should not have unmatched braces
        const openBraces = (template.match(/{/g) || []).length;
        const closeBraces = (template.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);

        // Should not have single braces (should be double or triple)
        expect(template).not.toMatch(/(?<!\{)\{(?!\{)/);
        expect(template).not.toMatch(/(?<!\})\}(?!\})/);
      });
    });

    it("should have consistent variable naming", () => {
      const { defaultTemplate } = notificationConfig;

      // Extract all variables from template
      const variables: string[] = defaultTemplate.match(/{{\w+}}/g) || [];

      variables.forEach((variable) => {
        // Should use camelCase
        const varName = variable.replace(/[{}]/g, "");
        expect(varName).toMatch(/^[a-z][a-zA-Z]*$/);
      });
    });

    it("should not contain dangerous template constructs", () => {
      const { defaultTemplate, emailSubjectTemplate } = notificationConfig;

      const templates = [defaultTemplate, emailSubjectTemplate];

      templates.forEach((template) => {
        // Should not contain script tags or dangerous HTML
        expect(template.toLowerCase()).not.toContain("<script");
        expect(template.toLowerCase()).not.toContain("_javascript:");
        expect(template.toLowerCase()).not.toContain("<iframe");
      });
    });
  });

  describe("template functionality", () => {
    it("should support conditional rendering", () => {
      const { defaultTemplate } = notificationConfig;

      // Should have if/endif blocks
      expect(defaultTemplate).toContain("{{#if");
      expect(defaultTemplate).toContain("{{/if}}");
    });

    it("should handle missing tags gracefully", () => {
      const { defaultTemplate } = notificationConfig;

      // Tags section should be conditional
      const tagSectionMatch = defaultTemplate.match(
        /{{#if tags}}[\s\S]*?{{\/if}}/,
      );
      expect(tagSectionMatch).toBeTruthy();

      if (tagSectionMatch) {
        const tagSection = tagSectionMatch[0];
        expect(tagSection).toContain("{{{tags}}}");
      }
    });

    it("should provide clear field labels", () => {
      const { defaultTemplate } = notificationConfig;

      // Each variable should have a Chinese label
      const variables = [
        "ruleName",
        "metric",
        "value",
        "threshold",
        "severity",
        "status",
        "startTime",
        "duration",
        "message",
      ];

      variables.forEach((variable) => {
        const regex = new RegExp(`[^}]+: {{${variable}}}`);
        expect(defaultTemplate).toMatch(regex);
      });
    });
  });

  describe("configuration structure", () => {
    it("should export required properties", () => {
      expect(notificationConfig).toHaveProperty("defaultTemplate");
      expect(notificationConfig).toHaveProperty("emailSubjectTemplate");
    });

    it("should have string values", () => {
      expect(typeof notificationConfig.defaultTemplate).toBe("string");
      expect(typeof notificationConfig.emailSubjectTemplate).toBe("string");
    });

    it("should not have unexpected properties", () => {
      const expectedProperties = ["defaultTemplate", "emailSubjectTemplate"];
      const actualProperties = Object.keys(notificationConfig);

      actualProperties.forEach((prop) => {
        expect(expectedProperties).toContain(prop);
      });

      expect(actualProperties).toHaveLength(expectedProperties.length);
    });
  });

  describe("localization support", () => {
    it("should use Chinese labels consistently", () => {
      const { defaultTemplate } = notificationConfig;

      // Should contain Chinese characters
      expect(defaultTemplate).toMatch(/[\u4e00-\u9fff]/);

      // Key terms should be in Chinese
      expect(defaultTemplate).toContain("告警");
      expect(defaultTemplate).toContain("规则");
      expect(defaultTemplate).toContain("监控");
      expect(defaultTemplate).toContain("阈值");
      expect(defaultTemplate).toContain("严重");
      expect(defaultTemplate).toContain("状态");
      expect(defaultTemplate).toContain("时间");
      expect(defaultTemplate).toContain("持续");
      expect(defaultTemplate).toContain("消息");
      expect(defaultTemplate).toContain("标签");
    });

    it("should maintain consistent punctuation", () => {
      const { defaultTemplate } = notificationConfig;

      // Should use consistent colon usage
      const colonLines = defaultTemplate
        .split("\n")
        .filter((line) => line.includes(":"));
      colonLines.forEach((line) => {
        if (line.includes("{{") && line.includes("}}")) {
          expect(line).toMatch(/: {{/);
        }
      });
    });
  });
});
