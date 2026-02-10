import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalSettingDto } from './create-global-setting.dto';

export class UpdateGlobalSettingDto extends PartialType(CreateGlobalSettingDto) {}
