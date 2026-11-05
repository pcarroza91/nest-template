import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { UserSessionsController } from './user-sessions.controller';

@Module({
  controllers: [SessionsController, UserSessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
