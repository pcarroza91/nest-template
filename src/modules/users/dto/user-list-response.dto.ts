import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.dto';

export class UserListResponse {
  @ApiProperty({ type: [User] })
  items!: User[];
}
