import { validate } from 'class-validator';
import { DingTalkConfigDto } from '@notification/dto/channels/dingtalk-notification.dto';

describe('DingTalkConfigDto', () => {
  it('should be defined', () => {
    expect(new DingTalkConfigDto()).toBeDefined();
  });

  it('should validate a correct DingTalkConfigDto', async () => {
    const dto = new DingTalkConfigDto();
    dto.webhook_url = 'https://oapi.dingtalk.com/robot/send?access_token=test';
    dto.secret = 'SECtestsecret';
    dto.at_all = false;
    dto.at_mobiles = ['+8613812345678'];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if webhook_url is invalid', async () => {
    const dto = new DingTalkConfigDto();
    dto.webhook_url = 'invalid-url';
    dto.secret = 'SECtestsecret';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('webhook_url');
    expect(errors[0].constraints).toHaveProperty('IsValidUrlConstraint');
  });

  it('should fail validation if secret is empty', async () => {
    const dto = new DingTalkConfigDto();
    dto.webhook_url = 'https://oapi.dingtalk.com/robot/send?access_token=test';
    dto.secret = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('secret');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should allow at_all to be true', async () => {
    const dto = new DingTalkConfigDto();
    dto.webhook_url = 'https://oapi.dingtalk.com/robot/send?access_token=test';
    dto.secret = 'SECtestsecret';
    dto.at_all = true;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow at_mobiles to be an empty array', async () => {
    const dto = new DingTalkConfigDto();
    dto.webhook_url = 'https://oapi.dingtalk.com/robot/send?access_token=test';
    dto.secret = 'SECtestsecret';
    dto.at_mobiles = [];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow at_mobiles to be undefined', async () => {
    const dto = new DingTalkConfigDto();
    dto.webhook_url = 'https://oapi.dingtalk.com/robot/send?access_token=test';
    dto.secret = 'SECtestsecret';
    // at_mobiles is undefined by default

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});