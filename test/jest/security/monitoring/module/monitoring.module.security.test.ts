import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringModule } from '../../../src/monitoring/module/monitoring.module';

describe('MonitoringModule Security', () => {
  let monitoringModule: MonitoringModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringModule],
    }).compile();

    monitoringModule = module.get<MonitoringModule>(MonitoringModule);
  });

  it('should be defined', () => {
    expect(monitoringModule).toBeDefined();
  });
});
