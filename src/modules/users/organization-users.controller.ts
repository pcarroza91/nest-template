import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UserListResponse } from './dto/user-list-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationUsersController {
  constructor(private readonly service: UsersService) {}

  @Get(':id/users')
  @ApiOperation({ summary: 'Lista los usuarios de una organización' })
  @ApiStandardResponse(UserListResponse, HttpStatus.OK, 'Lista de usuarios y sus roles')
  listOrganizationUsers(
    @Param('id', ParseUUIDPipe) organizationId: string,
  ): Promise<UserListResponse> {
    return this.service.listOrganizationUsers(organizationId);
  }
}
