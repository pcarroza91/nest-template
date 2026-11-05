import { Injectable } from '@nestjs/common';
import { AckResponse } from 'src/common/dto/ack-response.dto';

@Injectable()
export class SessionsService {
  revokeSession(_sessionId: string): Promise<AckResponse> {
    return Promise.resolve({ ok: true });
  }

  revokeAllSessions(): Promise<AckResponse> {
    return Promise.resolve({ ok: true });
  }
}
