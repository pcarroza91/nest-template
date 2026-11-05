import { Injectable } from '@nestjs/common';
import { TransferOwnershipRequest } from './dto/transfer-ownership-request.dto';
import { TransferOwnershipResponse } from './dto/transfer-ownership-response.dto';

@Injectable()
export class OrganizationsService {
  transferOwnership(
    _organizationId: string,
    dto: TransferOwnershipRequest,
  ): Promise<TransferOwnershipResponse> {
    return Promise.resolve({
      previous_owner_role_assignment_id: '11111111-1111-4111-8111-111111111111',
      new_owner_role_assignment_id: dto.new_owner_role_assignment_id,
    });
  }
}
