import { validate } from 'class-validator';
import { LogConfigDto } from '@notification/dto/channels/log-notification.dto';

describe('LogConfigDto', () => {
  it('should be defined', () => {
    expect(new LogConfigDto()).toBeDefined();
  });

  it('should validate a correct LogConfigDto', async () => {
    const dto = new LogConfigDto();
    dto.level = 'info';
    dto.tag = 'test-tag';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if level is invalid', async () => {
    const dto = new LogConfigDto();
    dto.level = 'invalid-level';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('level');
    expect(errors[0].constraints).toHaveProperty('isEnum');
  });

  it('should allow tag to be optional', async () => {
    const dto = new LogConfigDto();
    dto.level = 'warn';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow tag to be a string', async () => {
    const dto = new LogConfigDto();
    dto.level = 'debug';
    dto.tag = 'another-tag';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});