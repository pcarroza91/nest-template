import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/modules/users/dto/user.dto';
import { BackofficeService } from './backoffice.service';
import { CreateBackofficeUserRequest } from './dto/create-backoffice-user-request.dto';

@ApiTags('Backoffice')
@ApiBearerAuth()
@Controller('backoffice')
@UseGuards(JwtAuthGuard)
export class BackofficeController {
  constructor(private readonly service: BackofficeService) {}

  @Post('users')
  @ApiOperation({ summary: 'Crea un empleado de Backoffice' })
  @ApiStandardResponse(User, HttpStatus.CREATED, 'Empleado creado')
  createBackofficeUser(@Body() dto: CreateBackofficeUserRequest): Promise<User> {
    return this.service.createBackofficeUser(dto);
  }
}
