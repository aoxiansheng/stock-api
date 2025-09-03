import { getModelToken } from "@nestjs/mongoose";
import { v4 as uuidv4 } from "uuid";
import { NotFoundException } from "@nestjs/common";
import { Model } from "mongoose";
import { TestingModule } from "@nestjs/testing";

import { AlertRuleRepository } from "../../../../../src/alert/repositories/alert-rule.repository";
import { AlertRule, AlertRuleDocument } from "../../../../../src/alert/schemas";
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
} from "../../../../../src/alert/dto";

describe("AlertRuleRepository (Integration)", () => {
  let repository: AlertRuleRepository;
  let alertRuleModel: Model<AlertRuleDocument>;

  beforeAll(async () => {
    // The testModule is globally available from integration.setup.ts
    const testModule: TestingModule = (global as any).testModule;
    repository = testModule.get<AlertRuleRepository>(AlertRuleRepository);
    alertRuleModel = testModule.get<Model<AlertRuleDocument>>(
      getModelToken(AlertRule.name),
    );
  });

  // Clean up the collection before each test
  beforeEach(async () => {
    await alertRuleModel.deleteMany({});
  });

  const createTestRule = (
    override: Partial<CreateAlertRuleDto> = {},
  ): CreateAlertRuleDto & { id: string } => ({
    id: uuidv4(),
    name: "Test Rule",
    metric: "cpu.usage",
    operator: "gt",
    threshold: 90,
    duration: 60,
    severity: "critical",
    enabled: true,
    channels: [],
    cooldown: 300,
    ...override,
  });

  describe("create", () => {
    it("should create a new alert rule successfully", async () => {
      const dto = createTestRule();
      const createdRule = await repository.create(dto);

      expect(createdRule).toBeDefined();
      expect(createdRule.id).toBe(dto.id);
      expect(createdRule.name).toBe(dto.name);

      const foundRule = await repository.findById(dto.id);
      expect(foundRule).not.toBeNull();
      expect(foundRule.name).toBe(dto.name);
    });
  });

  describe("update", () => {
    it("should update an existing rule", async () => {
      const dto = createTestRule();
      await repository.create(dto);

      const updateDto: UpdateAlertRuleDto = { name: "Updated Rule Name" };
      const updatedRule = await repository.update(dto.id, updateDto);

      expect(updatedRule.name).toBe("Updated Rule Name");

      const foundRule = await repository.findById(dto.id);
      expect(foundRule.name).toBe("Updated Rule Name");
    });

    it("should throw NotFoundException when updating a non-existent rule", async () => {
      const updateDto: UpdateAlertRuleDto = { name: "New Name" };
      await expect(
        repository.update("non-existent-id", updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should delete a rule and return true", async () => {
      const dto = createTestRule();
      await repository.create(dto);

      const result = await repository.delete(dto.id);
      expect(result).toBe(true);

      const foundRule = await repository.findById(dto.id);
      expect(foundRule).toBeNull();
    });

    it("should return false when trying to delete a non-existent rule", async () => {
      const result = await repository.delete("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("findAll and findAllEnabled", () => {
    it("should find all rules correctly", async () => {
      await repository.create(
        createTestRule({ name: "Rule 1", enabled: true }),
      );
      await repository.create(
        createTestRule({ name: "Rule 2", enabled: false }),
      );

      const allRules = await repository.findAll();
      expect(allRules).toHaveLength(2);

      const enabledRules = await repository.findAllEnabled();
      expect(enabledRules).toHaveLength(1);
      expect(enabledRules[0].name).toBe("Rule 1");
    });
  });

  describe("toggle", () => {
    it("should toggle the enabled status of a rule", async () => {
      const dto = createTestRule({ enabled: true });
      await repository.create(dto);

      let result = await repository.toggle(dto.id, false);
      expect(result).toBe(true);
      let found = await repository.findById(dto.id);
      expect(found.enabled).toBe(false);

      result = await repository.toggle(dto.id, true);
      expect(result).toBe(true);
      found = await repository.findById(dto.id);
      expect(found.enabled).toBe(true);
    });
  });

  describe("count", () => {
    it("should count all and enabled rules correctly", async () => {
      await repository.create(createTestRule({ enabled: true }));
      await repository.create(createTestRule({ enabled: true }));
      await repository.create(createTestRule({ enabled: false }));

      const allCount = await repository.countAll();
      expect(allCount).toBe(3);

      const enabledCount = await repository.countEnabled();
      expect(enabledCount).toBe(2);
    });
  });
});
