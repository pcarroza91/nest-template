import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateResourceDto } from './create-resource.dto';

export class UpdateResourceDto extends PartialType(OmitType(CreateResourceDto, ['code'] as const)) {
  readonly name: string | undefined;
  description: string | undefined;
  amount: undefined;
  status: undefined;
}
