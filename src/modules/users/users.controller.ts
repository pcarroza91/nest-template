import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AccessHistory } from './dto/access-history.dto';
import { AssignSchoolRequest } from './dto/assign-school-request.dto';
import { CreateUserRequest } from './dto/create-user-request.dto';
import { SchoolMembershipResponse } from './dto/school-membership-response.dto';
import { User } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un usuario (primer admin o adicional)' })
  @ApiStandardResponse(User, HttpStatus.CREATED, 'Usuario creado')
  createUser(@Body() dto: CreateUserRequest): Promise<User> {
    return this.service.createUser(dto);
  }

  @Post(':id/schools')
  @ApiOperation({ summary: 'Asigna un colegio existente a un usuario' })
  @ApiStandardResponse(SchoolMembershipResponse, HttpStatus.CREATED, 'Colegio asignado')
  assignSchool(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: AssignSchoolRequest,
  ): Promise<SchoolMembershipResponse> {
    return this.service.assignSchool(userId, dto);
  }

  @Post(':id/anonymize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Anonimiza datos personales (derecho al olvido)' })
  @ApiStandardResponse(AckResponse, HttpStatus.OK, 'Usuario anonimizado')
  anonymizeUser(@Param('id', ParseUUIDPipe) userId: string): Promise<AckResponse> {
    return this.service.anonymizeUser(userId);
  }

  @Get(':id/access-history')
  @ApiOperation({ summary: 'Historial de acceso (propio o retroactivo)' })
  @ApiStandardResponse(AccessHistory, HttpStatus.OK, 'Historial de acceso')
  getAccessHistory(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('date') date?: string,
  ): Promise<AccessHistory> {
    return this.service.getAccessHistory(userId, date);
  }
}
