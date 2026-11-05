import { Injectable } from '@nestjs/common';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { LoginRequest } from './dto/login-request.dto';
import { PasswordResetConfirmRequest } from './dto/password-reset-confirm-request.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { SsoLoginRequest } from './dto/sso-login-request.dto';
import { TokenPair } from './dto/token-pair.dto';
import { VerifyEmailResponse } from './dto/verify-email-response.dto';

@Injectable()
export class AuthService {
  login(_dto: LoginRequest): Promise<TokenPair> {
    return Promise.resolve({
      access_token: 'stub.jwt.token',
      refresh_token: 'stub-refresh-token',
      expires_in: 900,
    });
  }

  loginSso(_dto: SsoLoginRequest): Promise<TokenPair> {
    return Promise.resolve({
      access_token: 'stub.jwt.token',
      refresh_token: 'stub-refresh-token',
      expires_in: 900,
    });
  }

  verifyEmail(_token: string): Promise<VerifyEmailResponse> {
    return Promise.resolve({ ok: true, status: 'ACTIVO' });
  }

  requestPasswordReset(_dto: PasswordResetRequestDto): Promise<AckResponse> {
    return Promise.resolve({ ok: true });
  }

  confirmPasswordReset(_dto: PasswordResetConfirmRequest): Promise<AckResponse> {
    return Promise.resolve({ ok: true });
  }
}
