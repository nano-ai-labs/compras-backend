import { Test, TestingModule } from '@nestjs/testing';
import { GlobalSettingsController } from './global-settings.controller';

describe('GlobalSettingsController', () => {
  let controller: GlobalSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalSettingsController],
    }).compile();

    controller = module.get<GlobalSettingsController>(GlobalSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
