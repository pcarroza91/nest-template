import { Controller, HttpStatus, Delete, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Cierra una sesión específica' })
  @ApiStandardResponse(AckResponse, HttpStatus.OK, 'Sesión cerrada')
  revokeSession(@Param('id', ParseUUIDPipe) sessionId: string): Promise<AckResponse> {
    return this.service.revokeSession(sessionId);
  }
}
