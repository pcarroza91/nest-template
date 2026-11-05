import { Injectable } from '@nestjs/common';
import { CreateRoleAssignmentRequest } from './dto/create-role-assignment-request.dto';
import { RoleAssignment, RoleAssignmentStatus } from './dto/role-assignment.dto';
import { UpdateRoleAssignmentStatusRequest } from './dto/update-role-assignment-status-request.dto';

@Injectable()
export class RoleAssignmentsService {
  createRoleAssignment(dto: CreateRoleAssignmentRequest): Promise<RoleAssignment> {
    return Promise.resolve({
      id: '99999999-9999-4999-8999-999999999999',
      user_id: dto.user_id,
      role_id: dto.role_id,
      status: RoleAssignmentStatus.Activo,
      is_org_owner: false,
      module_id: dto.module_id,
      vigencia_desde: null,
      vigencia_hasta: null,
    });
  }

  updateRoleAssignmentStatus(
    roleAssignmentId: string,
    _dto: UpdateRoleAssignmentStatusRequest,
  ): Promise<RoleAssignment> {
    return Promise.resolve({
      id: roleAssignmentId,
      user_id: '22222222-2222-4222-8222-222222222222',
      role_id: '55555555-5555-4555-8555-555555555555',
      status: RoleAssignmentStatus.Suspendido,
      is_org_owner: false,
      module_id: null,
      vigencia_desde: null,
      vigencia_hasta: null,
    });
  }
}
