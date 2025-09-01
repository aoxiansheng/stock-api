/* eslint-disable @typescript-eslint/no-unused-vars */
import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { StorageQueryDto } from "@core/04-storage/storage/dto/storage-query.dto";
import { StorageClassification } from "../../../../../../../src/core/shared/types/storage-classification.enum";

describe("StorageQueryDto", () => {
  describe("Validation Rules", () => {
    it("should pass validation with valid page and limit", async () => {
      const dto = new StorageQueryDto();
      dto.page = 1;
      dto.limit = 10;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail validation with page less than 1", async () => {
      const dto = new StorageQueryDto();
      dto.page = 0;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("page");
    });

    it("should fail validation with limit less than 1", async () => {
      const dto = new StorageQueryDto();
      dto.limit = 0;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("limit");
    });

    it("should pass validation with valid string fields", async () => {
      const dto = new StorageQueryDto();
      dto.keySearch = "valid-key";
      dto.provider = "longport";
      dto.market = "HK";
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass validation with valid enum values", async () => {
      const dto = new StorageQueryDto();
      dto.storageClassification = StorageClassification.STOCK_QUOTE;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail validation with invalid enum value", async () => {
      const dto = new StorageQueryDto();
      // @ts-expect-error Testing invalid enum value
      dto.storageClassification = "INVALID";
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("storageClassification");
    });

    it("should pass validation with valid tags array", async () => {
      const dto = new StorageQueryDto();
      dto.tags = ["tag1", "tag2"];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass validation with valid dates", async () => {
      const dto = new StorageQueryDto();
      dto.startDate = new Date();
      dto.endDate = new Date();
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Class Transformer Integration", () => {
    it("should transform string numbers to actual numbers", () => {
      const plainObject = { page: "2", limit: "50" };
      const dto = plainToClass(StorageQueryDto, plainObject);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(50);
    });

    it("should transform string dates to Date objects", () => {
      const plainObject = { startDate: "2023-01-01", endDate: "2023-12-31" };
      const dto = plainToClass(StorageQueryDto, plainObject);
      expect(dto.startDate).toBeInstanceOf(Date);
      expect(dto.endDate).toBeInstanceOf(Date);
    });
  });
});
