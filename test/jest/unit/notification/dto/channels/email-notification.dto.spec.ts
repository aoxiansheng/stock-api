import { validate } from 'class-validator';
import { EmailConfigDto } from '@notification/dto/channels/email-notification.dto';

describe('EmailConfigDto', () => {
  it('should be defined', () => {
    expect(new EmailConfigDto()).toBeDefined();
  });

  it('should validate a correct EmailConfigDto', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'test@example.com';
    dto.subject = 'Test Subject';
    dto.cc = 'cc@example.com';
    dto.bcc = 'bcc@example.com';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if to is invalid', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'invalid-email';
    dto.subject = 'Test Subject';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('to');
    expect(errors[0].constraints).toHaveProperty('IsValidEmailConstraint');
  });

  it('should fail validation if subject is empty', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'test@example.com';
    dto.subject = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('subject');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail validation if subject is too long', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'test@example.com';
    dto.subject = 'a'.repeat(201);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('subject');
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should allow cc to be optional and valid', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'test@example.com';
    dto.subject = 'Test Subject';
    dto.cc = 'valid-cc@example.com';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if cc is invalid', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'test@example.com';
    dto.subject = 'Test Subject';
    dto.cc = 'invalid-cc';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('cc');
    expect(errors[0].constraints).toHaveProperty('IsValidEmailConstraint');
  });

  it('should allow bcc to be optional and valid', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'test@example.com';
    dto.subject = 'Test Subject';
    dto.bcc = 'valid-bcc@example.com';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if bcc is invalid', async () => {
    const dto = new EmailConfigDto();
    dto.to = 'test@example.com';
    dto.subject = 'Test Subject';
    dto.bcc = 'invalid-bcc';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('bcc');
    expect(errors[0].constraints).toHaveProperty('IsValidEmailConstraint');
  });
});