import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthMethodsService } from './auth-methods.service';
import { UpdateAuthMethodStatusRequest } from './dto/update-auth-method-status-request.dto';

@ApiTags('AuthMethods')
@ApiBearerAuth()
@Controller('auth-methods')
@UseGuards(JwtAuthGuard)
export class AuthMethodsController {
  constructor(private readonly service: AuthMethodsService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Revoca (u otro cambio de estado de) un método de autenticación' })
  @ApiStandardResponse(AckResponse, HttpStatus.OK, 'Método actualizado')
  updateAuthMethodStatus(
    @Param('id', ParseUUIDPipe) authMethodId: string,
    @Body() dto: UpdateAuthMethodStatusRequest,
  ): Promise<AckResponse> {
    return this.service.updateAuthMethodStatus(authMethodId, dto);
  }
}
