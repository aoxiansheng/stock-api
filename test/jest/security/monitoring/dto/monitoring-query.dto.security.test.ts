import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringQueryDto } from '../../../src/monitoring/dto/monitoring-query.dto';

describe('MonitoringQueryDto Security', () => {
  let monitoringQueryDto: MonitoringQueryDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringQueryDto],
    }).compile();

    monitoringQueryDto = module.get<MonitoringQueryDto>(MonitoringQueryDto);
  });

  it('should be defined', () => {
    expect(monitoringQueryDto).toBeDefined();
  });
});
