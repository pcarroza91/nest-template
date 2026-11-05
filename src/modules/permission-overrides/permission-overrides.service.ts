import { Injectable } from '@nestjs/common';
import { CreatePermissionOverrideRequest } from './dto/create-permission-override-request.dto';
import { PermissionOverride, PermissionOverrideStatus } from './dto/permission-override.dto';

@Injectable()
export class PermissionOverridesService {
  createPermissionOverride(dto: CreatePermissionOverrideRequest): Promise<PermissionOverride> {
    return Promise.resolve({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      user_id: dto.user_id,
      permission_id: dto.permission_id,
      status: PermissionOverrideStatus.Activo,
      vigencia_desde: null,
      vigencia_hasta: dto.vigencia_hasta,
    });
  }
}
