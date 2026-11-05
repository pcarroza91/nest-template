import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthMethodsService } from './auth-methods.service';
import { MfaActivateRequest } from './dto/mfa-activate-request.dto';
import { MfaActivateResponse } from './dto/mfa-activate-response.dto';
import { MfaVerifyRequest } from './dto/mfa-verify-request.dto';

@ApiTags('AuthMethods')
@ApiBearerAuth()
@Controller('users/me/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly service: AuthMethodsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicia la activación de doble factor' })
  @ApiStandardResponse(
    MfaActivateResponse,
    HttpStatus.OK,
    'Secreto / código de configuración generado',
  )
  initiateMfaActivation(@Body() dto: MfaActivateRequest): Promise<MfaActivateResponse> {
    return this.service.initiateMfaActivation(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Confirma doble factor con código' })
  @ApiStandardResponse(AckResponse, HttpStatus.OK, '2FA activado')
  verifyMfaActivation(
    @Param('id', ParseUUIDPipe) mfaMethodId: string,
    @Body() dto: MfaVerifyRequest,
  ): Promise<AckResponse> {
    return this.service.verifyMfaActivation(mfaMethodId, dto);
  }
}
