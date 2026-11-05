import { ApiProperty } from '@nestjs/swagger';
import { AuthMethodSummary } from 'src/modules/auth-methods/dto/auth-method-summary.dto';
import { RoleAssignment } from 'src/modules/role-assignments/dto/role-assignment.dto';
import { SessionSummary } from 'src/modules/sessions/dto/session-summary.dto';

export class AccessHistory {
  @ApiProperty({ format: 'date' })
  date!: string;

  @ApiProperty({ type: () => [RoleAssignment] })
  role_assignments!: RoleAssignment[];

  @ApiProperty({ type: [AuthMethodSummary] })
  auth_methods!: AuthMethodSummary[];

  @ApiProperty({ type: [SessionSummary] })
  sessions!: SessionSummary[];
}
