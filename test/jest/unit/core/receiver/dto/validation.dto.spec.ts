
import { ValidationResultDto } from '../../../../../../src/core/receiver/dto/validation.dto';

describe('ValidationResultDto', () => {

  describe('constructor', () => {
    it('应能正确创建实例并赋值', () => {
      const errors = ['Error 1'];
      const warnings = ['Warning 1'];
      const dto = new ValidationResultDto(false, errors, warnings);

      expect(dto.isValid).toBe(false);
      expect(dto.errors).toEqual(errors);
      expect(dto.warnings).toEqual(warnings);
    });
  });

  describe('static valid()', () => {
    it('应创建一个表示验证通过的实例', () => {
      const dto = ValidationResultDto.valid();

      expect(dto.isValid).toBe(true);
      expect(dto.errors).toEqual([]);
      expect(dto.warnings).toBeUndefined();
    });

    it('当提供警告信息时，应创建一个包含警告的有效实例', () => {
      const warnings = ['This is a warning'];
      const dto = ValidationResultDto.valid(warnings);

      expect(dto.isValid).toBe(true);
      expect(dto.errors).toEqual([]);
      expect(dto.warnings).toEqual(warnings);
    });
  });

  describe('static invalid()', () => {
    it('应创建一个表示验证失败的实例', () => {
      const errors = ['Field is required', 'Invalid format'];
      const dto = ValidationResultDto.invalid(errors);

      expect(dto.isValid).toBe(false);
      expect(dto.errors).toEqual(errors);
      expect(dto.warnings).toBeUndefined();
    });

    it('当提供警告信息时，应创建一个包含错误和警告的无效实例', () => {
      const errors = ['Field is required'];
      const warnings = ['This is a warning'];
      const dto = ValidationResultDto.invalid(errors, warnings);

      expect(dto.isValid).toBe(false);
      expect(dto.errors).toEqual(errors);
      expect(dto.warnings).toEqual(warnings);
    });
  });

});
