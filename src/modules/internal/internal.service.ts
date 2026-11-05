import { Injectable } from '@nestjs/common';
import { InternalAuthorizeRequest } from './dto/internal-authorize-request.dto';
import { InternalAuthorizeResponse } from './dto/internal-authorize-response.dto';

@Injectable()
export class InternalService {
  internalAuthorize(_dto: InternalAuthorizeRequest): Promise<InternalAuthorizeResponse> {
    return Promise.resolve({ authorized: true, reason: null });
  }
}
