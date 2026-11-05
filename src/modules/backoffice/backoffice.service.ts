import { Injectable } from '@nestjs/common';
import { User, UserStatus } from 'src/modules/users/dto/user.dto';
import { BackofficeClientAccessResponse } from './dto/backoffice-client-access-response.dto';
import { CreateBackofficeClientAccessRequest } from './dto/create-backoffice-client-access-request.dto';
import { CreateBackofficeUserRequest } from './dto/create-backoffice-user-request.dto';

@Injectable()
export class BackofficeService {
  createBackofficeUser(dto: CreateBackofficeUserRequest): Promise<User> {
    return Promise.resolve({
      id: '77777777-7777-4777-8777-777777777777',
      full_name: 'Empleado de ejemplo',
      email: dto.email,
      organization_id: null,
      status: UserStatus.PendienteVerificacion,
      email_verified_at: null,
      created_at: '2026-08-25T12:00:00.000Z',
    });
  }

  createBackofficeClientAccess(
    dto: CreateBackofficeClientAccessRequest,
  ): Promise<BackofficeClientAccessResponse> {
    return Promise.resolve({
      role_assignment_id: dto.role_assignment_id,
      organization_ids: dto.organization_ids,
    });
  }
}
