import { validate } from 'class-validator';
import { WebhookConfigDto } from '@notification/dto/channels/webhook-notification.dto';

describe('WebhookConfigDto', () => {
  it('should be defined', () => {
    expect(new WebhookConfigDto()).toBeDefined();
  });

  it('should validate a correct WebhookConfigDto', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'https://api.example.com/webhook';
    dto.method = 'POST';
    dto.headers = { 'Content-Type': 'application/json' };
    dto.timeout = 5000;
    dto.token = 'Bearer token';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if url is invalid', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'invalid-url';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('url');
    expect(errors[0].constraints).toHaveProperty('IsValidUrlConstraint');
  });

  it('should fail validation if method is invalid', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'https://api.example.com/webhook';
    dto.method = 'INVALID';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('method');
    expect(errors[0].constraints).toHaveProperty('isEnum');
  });

  it('should allow headers to be optional and valid', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'https://api.example.com/webhook';
    dto.headers = { 'Auth': 'token' };

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow timeout to be optional and valid', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'https://api.example.com/webhook';
    dto.timeout = 10000;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if timeout is too low', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'https://api.example.com/webhook';
    dto.timeout = 500;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('timeout');
    expect(errors[0].constraints).toHaveProperty('min');
  });

  it('should fail validation if timeout is too high', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'https://api.example.com/webhook';
    dto.timeout = 70000;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('timeout');
    expect(errors[0].constraints).toHaveProperty('max');
  });

  it('should allow token to be optional and valid', async () => {
    const dto = new WebhookConfigDto();
    dto.url = 'https://api.example.com/webhook';
    dto.token = 'some-token';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});