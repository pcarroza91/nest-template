import { Module } from '@nestjs/common';
import { BackofficeClientAccessController } from './backoffice-client-access.controller';
import { BackofficeController } from './backoffice.controller';
import { BackofficeService } from './backoffice.service';

@Module({
  controllers: [BackofficeController, BackofficeClientAccessController],
  providers: [BackofficeService],
})
export class BackofficeModule {}
