import { validate } from 'class-validator';
import { SlackConfigDto } from '@notification/dto/channels/slack-notification.dto';

describe('SlackConfigDto', () => {
  it('should be defined', () => {
    expect(new SlackConfigDto()).toBeDefined();
  });

  it('should validate a correct SlackConfigDto', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
    dto.channel = '#alerts';
    dto.username = 'AlertBot';
    dto.icon_emoji = ':warning:';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if webhook_url is invalid', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'invalid-url';
    dto.channel = '#alerts';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('webhook_url');
    expect(errors[0].constraints).toHaveProperty('IsValidUrlConstraint');
  });

  it('should fail validation if channel is empty', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
    dto.channel = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('channel');
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail validation if channel is too long', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
    dto.channel = '#'.repeat(81);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('channel');
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should allow username to be optional and valid', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
    dto.channel = '#alerts';
    dto.username = 'valid-username';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if username is too long', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
    dto.channel = '#alerts';
    dto.username = 'a'.repeat(51);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('username');
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('should allow icon_emoji to be optional and valid', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
    dto.channel = '#alerts';
    dto.icon_emoji = ':smiley:';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if icon_emoji is too long', async () => {
    const dto = new SlackConfigDto();
    dto.webhook_url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';
    dto.channel = '#alerts';
    dto.icon_emoji = ':'.repeat(51);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toEqual('icon_emoji');
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});