import { Module } from '@nestjs/common';
import { AuthMethodsController } from './auth-methods.controller';
import { AuthMethodsService } from './auth-methods.service';
import { MfaController } from './mfa.controller';

@Module({
  controllers: [MfaController, AuthMethodsController],
  providers: [AuthMethodsService],
})
export class AuthMethodsModule {}
