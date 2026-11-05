import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginRequest } from './dto/login-request.dto';
import { PasswordResetConfirmRequest } from './dto/password-reset-confirm-request.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { SsoLoginRequest } from './dto/sso-login-request.dto';
import { TokenPair } from './dto/token-pair.dto';
import { VerifyEmailResponse } from './dto/verify-email-response.dto';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con email y contraseña' })
  @ApiStandardResponse(TokenPair, HttpStatus.OK, 'Login exitoso')
  login(@Body() dto: LoginRequest): Promise<TokenPair> {
    return this.service.login(dto);
  }

  @Post('sso')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login mediante proveedor SSO' })
  @ApiStandardResponse(TokenPair, HttpStatus.OK, 'Login exitoso')
  loginSso(@Body() dto: SsoLoginRequest): Promise<TokenPair> {
    return this.service.loginSso(dto);
  }

  @Get('verify-email')
  @Public()
  @ApiOperation({ summary: 'Verificar correo electrónico' })
  @ApiStandardResponse(VerifyEmailResponse, HttpStatus.OK, 'Correo verificado, cuenta activa')
  verifyEmail(@Query('token') token: string): Promise<VerifyEmailResponse> {
    return this.service.verifyEmail(token);
  }

  @Post('password-reset/request')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar reset de contraseña' })
  @ApiStandardResponse(AckResponse, HttpStatus.OK, 'Si el email existe, se envió un correo')
  requestPasswordReset(@Body() dto: PasswordResetRequestDto): Promise<AckResponse> {
    return this.service.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar nueva contraseña' })
  @ApiStandardResponse(AckResponse, HttpStatus.OK, 'Contraseña actualizada')
  confirmPasswordReset(@Body() dto: PasswordResetConfirmRequest): Promise<AckResponse> {
    return this.service.confirmPasswordReset(dto);
  }
}
