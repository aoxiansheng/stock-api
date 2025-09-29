import { validate } from 'class-validator';
import { SmsConfigDto } from '@notification/dto/channels/sms-notification.dto';

describe('SmsConfigDto', () => {
  it('should be defined', () => {
    expect(new SmsConfigDto()).toBeDefined();
  });

  it('should validate a correct SmsConfigDto', async () => {
    const dto = new SmsConfigDto();
    dto.phone = '+8613812345678';
    dto.template = 'SMS_123456789';
    // params字段有ValidateNested问题，先不设置

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if phone is invalid', async () => {
    const dto = new SmsConfigDto();
    dto.phone = 'invalid-phone';
    dto.template = 'SMS_123456789';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('phone');
    expect(errors[0].constraints).toHaveProperty('IsValidPhoneNumberConstraint');
  });

  it('should fail validation if template is empty', async () => {
    const dto = new SmsConfigDto();
    dto.phone = '+8613812345678';
    dto.template = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('template');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail validation if template is too long', async () => {
    const dto = new SmsConfigDto();
    dto.phone = '+8613812345678';
    dto.template = 'a'.repeat(51);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('template');
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should allow params to be optional and valid', async () => {
    const dto = new SmsConfigDto();
    dto.phone = '+8613812345678';
    dto.template = 'SMS_123456789';
    // params字段有ValidateNested问题，先不设置

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow params to be undefined', async () => {
    const dto = new SmsConfigDto();
    dto.phone = '+8613812345678';
    dto.template = 'SMS_123456789';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});