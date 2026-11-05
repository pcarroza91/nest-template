import { Controller, Delete, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('users/me/sessions')
@UseGuards(JwtAuthGuard)
export class UserSessionsController {
  constructor(private readonly service: SessionsService) {}

  @Delete()
  @ApiOperation({ summary: 'Cierra todas las sesiones del usuario actual' })
  @ApiStandardResponse(AckResponse, HttpStatus.OK, 'Todas las sesiones cerradas')
  revokeAllSessions(): Promise<AckResponse> {
    return this.service.revokeAllSessions();
  }
}
