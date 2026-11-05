import { Injectable } from '@nestjs/common';
import { AckResponse } from 'src/common/dto/ack-response.dto';
import { AuthMethodType } from 'src/modules/auth-methods/dto/auth-method-summary.dto';
import { RoleAssignmentStatus } from 'src/modules/role-assignments/dto/role-assignment.dto';
import { AccessHistory } from './dto/access-history.dto';
import { AssignSchoolRequest } from './dto/assign-school-request.dto';
import { CreateUserRequest } from './dto/create-user-request.dto';
import {
  SchoolMembershipResponse,
  SchoolMembershipStatus,
} from './dto/school-membership-response.dto';
import { User, UserStatus } from './dto/user.dto';
import { UserListResponse } from './dto/user-list-response.dto';
import { UsersMapper } from './mappers/users.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly mapper: UsersMapper) {}

  createUser(dto: CreateUserRequest): Promise<User> {
    return Promise.resolve(
      this.mapper.toUser({
        id: '22222222-2222-4222-8222-222222222222',
        fullName: 'Usuario de ejemplo',
        email: dto.email,
        organizationId: dto.organization_id,
        status: UserStatus.PendienteVerificacion,
        emailVerifiedAt: null,
        createdAt: new Date('2026-08-25T12:00:00.000Z'),
      }),
    );
  }

  assignSchool(userId: string, dto: AssignSchoolRequest): Promise<SchoolMembershipResponse> {
    return Promise.resolve(
      this.mapper.toSchoolMembership({
        id: '33333333-3333-4333-8333-333333333333',
        userId,
        schoolId: dto.school_id,
        status: SchoolMembershipStatus.Activo,
        validFrom: null,
        validTo: null,
      }),
    );
  }

  anonymizeUser(_userId: string): Promise<AckResponse> {
    return Promise.resolve({ ok: true });
  }

  getAccessHistory(_userId: string, _date?: string): Promise<AccessHistory> {
    return Promise.resolve(
      this.mapper.toAccessHistory({
        date: new Date('2026-08-25T00:00:00.000Z'),
        roleAssignments: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            userId: '22222222-2222-4222-8222-222222222222',
            roleId: '55555555-5555-4555-8555-555555555555',
            status: RoleAssignmentStatus.Activo,
            isOrgOwner: false,
            moduleId: null,
            validFrom: null,
            validTo: null,
          },
        ],
        authMethods: [
          { type: AuthMethodType.Password, createdAt: new Date('2026-01-10T12:00:00.000Z') },
        ],
        sessions: [
          { deviceInfo: 'Chrome en Windows', lastUsedAt: new Date('2026-08-24T18:30:00.000Z') },
        ],
      }),
    );
  }

  listOrganizationUsers(_organizationId: string): Promise<UserListResponse> {
    return Promise.resolve(
      this.mapper.toUserList([
        {
          id: '22222222-2222-4222-8222-222222222222',
          fullName: 'Usuario de ejemplo',
          email: 'usuario@example.com',
          organizationId: '66666666-6666-4666-8666-666666666666',
          status: UserStatus.Activo,
          emailVerifiedAt: new Date('2026-01-10T12:00:00.000Z'),
          createdAt: new Date('2026-01-01T09:00:00.000Z'),
        },
      ]),
    );
  }
}
