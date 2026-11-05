import { Injectable } from '@nestjs/common';
import {
  AuthMethodSummary,
  AuthMethodType,
} from 'src/modules/auth-methods/dto/auth-method-summary.dto';
import {
  RoleAssignment,
  RoleAssignmentStatus,
} from 'src/modules/role-assignments/dto/role-assignment.dto';
import { SessionSummary } from 'src/modules/sessions/dto/session-summary.dto';
import { AccessHistory } from '../dto/access-history.dto';
import {
  SchoolMembershipResponse,
  SchoolMembershipStatus,
} from '../dto/school-membership-response.dto';
import { User, UserStatus } from '../dto/user.dto';
import { UserListResponse } from '../dto/user-list-response.dto';

export interface UserData {
  id: string;
  fullName: string;
  email: string;
  organizationId: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export interface SchoolMembershipData {
  id: string;
  userId: string;
  schoolId: string;
  status: SchoolMembershipStatus;
  validFrom: Date | null;
  validTo: Date | null;
}

export interface RoleAssignmentData {
  id: string;
  userId: string;
  roleId: string;
  status: RoleAssignmentStatus;
  isOrgOwner: boolean;
  moduleId: number | null;
  validFrom: Date | null;
  validTo: Date | null;
}

export interface AuthMethodData {
  type: AuthMethodType;
  createdAt: Date;
}

export interface SessionData {
  deviceInfo: string | null;
  lastUsedAt: Date | null;
}

export interface AccessHistoryData {
  date: Date;
  roleAssignments: RoleAssignmentData[];
  authMethods: AuthMethodData[];
  sessions: SessionData[];
}

const toDateTime = (value: Date): string => value.toISOString();

const toDate = (value: Date): string => value.toISOString().slice(0, 10);

const toNullableDateTime = (value: Date | null): string | null =>
  value === null ? null : toDateTime(value);

const toNullableDate = (value: Date | null): string | null =>
  value === null ? null : toDate(value);

@Injectable()
export class UsersMapper {
  toUser(user: UserData): User {
    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      organization_id: user.organizationId,
      status: user.status,
      email_verified_at: toNullableDateTime(user.emailVerifiedAt),
      created_at: toDateTime(user.createdAt),
    };
  }

  toUserList(users: UserData[]): UserListResponse {
    return { items: users.map((user) => this.toUser(user)) };
  }

  toSchoolMembership(membership: SchoolMembershipData): SchoolMembershipResponse {
    return {
      id: membership.id,
      user_id: membership.userId,
      school_id: membership.schoolId,
      status: membership.status,
      vigencia_desde: toNullableDate(membership.validFrom),
      vigencia_hasta: toNullableDate(membership.validTo),
    };
  }

  toAccessHistory(history: AccessHistoryData): AccessHistory {
    return {
      date: toDate(history.date),
      role_assignments: history.roleAssignments.map((item) => this.toRoleAssignment(item)),
      auth_methods: history.authMethods.map((item) => this.toAuthMethodSummary(item)),
      sessions: history.sessions.map((item) => this.toSessionSummary(item)),
    };
  }

  private toRoleAssignment(assignment: RoleAssignmentData): RoleAssignment {
    return {
      id: assignment.id,
      user_id: assignment.userId,
      role_id: assignment.roleId,
      status: assignment.status,
      is_org_owner: assignment.isOrgOwner,
      module_id: assignment.moduleId,
      vigencia_desde: toNullableDate(assignment.validFrom),
      vigencia_hasta: toNullableDate(assignment.validTo),
    };
  }

  private toAuthMethodSummary(method: AuthMethodData): AuthMethodSummary {
    return { type: method.type, created_at: toDateTime(method.createdAt) };
  }

  private toSessionSummary(session: SessionData): SessionSummary {
    return {
      device_info: session.deviceInfo,
      last_used_at: toNullableDateTime(session.lastUsedAt),
    };
  }
}
