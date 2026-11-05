import { Injectable } from '@nestjs/common';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { MfaActivateRequest } from './dto/mfa-activate-request.dto';
import { MfaActivateResponse } from './dto/mfa-activate-response.dto';
import { MfaVerifyRequest } from './dto/mfa-verify-request.dto';
import { UpdateAuthMethodStatusRequest } from './dto/update-auth-method-status-request.dto';

@Injectable()
export class AuthMethodsService {
  initiateMfaActivation(_dto: MfaActivateRequest): Promise<MfaActivateResponse> {
    return Promise.resolve({
      mfa_method_id: '88888888-8888-4888-8888-888888888888',
      secret: 'JBSWY3DPEHPK3PXP',
      qr_code_url: 'https://stub.numerusverify.local/mfa/qr/88888888-8888-4888-8888-888888888888',
    });
  }

  verifyMfaActivation(_mfaMethodId: string, _dto: MfaVerifyRequest): Promise<AckResponse> {
    return Promise.resolve({ ok: true });
  }

  updateAuthMethodStatus(
    _authMethodId: string,
    _dto: UpdateAuthMethodStatusRequest,
  ): Promise<AckResponse> {
    return Promise.resolve({ ok: true });
  }
}
