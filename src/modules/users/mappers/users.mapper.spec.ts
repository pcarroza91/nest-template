import { AuthMethodType } from 'src/modules/auth-methods/dto/auth-method-summary.dto';
import { RoleAssignmentStatus } from 'src/modules/role-assignments/dto/role-assignment.dto';
import { SchoolMembershipStatus } from '../dto/school-membership-response.dto';
import { UserStatus } from '../dto/user.dto';
import { UserData, UsersMapper } from './users.mapper';

const buildUser = (overrides: Partial<UserData> = {}): UserData => ({
  id: '22222222-2222-4222-8222-222222222222',
  fullName: 'Usuario de ejemplo',
  email: 'usuario@example.com',
  organizationId: '66666666-6666-4666-8666-666666666666',
  status: UserStatus.Activo,
  emailVerifiedAt: new Date('2026-01-10T12:00:00.000Z'),
  createdAt: new Date('2026-01-01T09:00:00.000Z'),
  ...overrides,
});

describe('UsersMapper', () => {
  const mapper = new UsersMapper();

  it('toUser pasa a snake_case y serializa las fechas en ISO 8601', () => {
    expect(mapper.toUser(buildUser())).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      full_name: 'Usuario de ejemplo',
      email: 'usuario@example.com',
      organization_id: '66666666-6666-4666-8666-666666666666',
      status: UserStatus.Activo,
      email_verified_at: '2026-01-10T12:00:00.000Z',
      created_at: '2026-01-01T09:00:00.000Z',
    });
  });

  it('toUser conserva los nulos', () => {
    const result = mapper.toUser(buildUser({ organizationId: null, emailVerifiedAt: null }));

    expect(result.organization_id).toBeNull();
    expect(result.email_verified_at).toBeNull();
  });

  it('toUserList envuelve los usuarios en items', () => {
    const result = mapper.toUserList([buildUser(), buildUser({ id: 'otro' })]);

    expect(result.items.map((user) => user.id)).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'otro',
    ]);
  });

  it('toSchoolMembership serializa la vigencia como fecha sin hora', () => {
    const result = mapper.toSchoolMembership({
      id: 'm1',
      userId: 'u1',
      schoolId: 's1',
      status: SchoolMembershipStatus.Activo,
      validFrom: new Date('2026-03-01T00:00:00.000Z'),
      validTo: null,
    });

    expect(result).toEqual({
      id: 'm1',
      user_id: 'u1',
      school_id: 's1',
      status: SchoolMembershipStatus.Activo,
      vigencia_desde: '2026-03-01',
      vigencia_hasta: null,
    });
  });

  it('toAccessHistory mapea cada colección anidada', () => {
    const result = mapper.toAccessHistory({
      date: new Date('2026-08-25T00:00:00.000Z'),
      roleAssignments: [
        {
          id: 'ra1',
          userId: 'u1',
          roleId: 'r1',
          status: RoleAssignmentStatus.Activo,
          isOrgOwner: true,
          moduleId: 7,
          validFrom: null,
          validTo: new Date('2026-12-31T00:00:00.000Z'),
        },
      ],
      authMethods: [
        { type: AuthMethodType.Password, createdAt: new Date('2026-01-10T12:00:00.000Z') },
      ],
      sessions: [{ deviceInfo: null, lastUsedAt: null }],
    });

    expect(result).toEqual({
      date: '2026-08-25',
      role_assignments: [
        {
          id: 'ra1',
          user_id: 'u1',
          role_id: 'r1',
          status: RoleAssignmentStatus.Activo,
          is_org_owner: true,
          module_id: 7,
          vigencia_desde: null,
          vigencia_hasta: '2026-12-31',
        },
      ],
      auth_methods: [{ type: AuthMethodType.Password, created_at: '2026-01-10T12:00:00.000Z' }],
      sessions: [{ device_info: null, last_used_at: null }],
    });
  });
});
