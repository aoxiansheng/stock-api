import { Test, TestingModule } from '@nestjs/testing';
import { SwaggerResponsesDecorator } from '../../../src/common/core/decorators/swagger-responses.decorator';

describe('SwaggerResponsesDecorator Integration', () => {
  let swaggerResponsesDecorator: SwaggerResponsesDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SwaggerResponsesDecorator],
    }).compile();

    swaggerResponsesDecorator = module.get<SwaggerResponsesDecorator>(SwaggerResponsesDecorator);
  });

  it('should be defined', () => {
    expect(swaggerResponsesDecorator).toBeDefined();
  });
});
