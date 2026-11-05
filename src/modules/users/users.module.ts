import { Module } from '@nestjs/common';
import { OrganizationUsersController } from './organization-users.controller';
import { UsersController } from './users.controller';
import { UsersMapper } from './mappers/users.mapper';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, OrganizationUsersController],
  providers: [UsersService, UsersMapper],
})
export class UsersModule {}
