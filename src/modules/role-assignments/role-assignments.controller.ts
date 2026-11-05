import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateRoleAssignmentRequest } from './dto/create-role-assignment-request.dto';
import { RoleAssignment } from './dto/role-assignment.dto';
import { UpdateRoleAssignmentStatusRequest } from './dto/update-role-assignment-status-request.dto';
import { RoleAssignmentsService } from './role-assignments.service';

@ApiTags('RoleAssignments')
@ApiBearerAuth()
@Controller('role-assignments')
@UseGuards(JwtAuthGuard)
export class RoleAssignmentsController {
  constructor(private readonly service: RoleAssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Asigna un cargo a un usuario' })
  @ApiStandardResponse(RoleAssignment, HttpStatus.CREATED, 'Cargo asignado')
  createRoleAssignment(@Body() dto: CreateRoleAssignmentRequest): Promise<RoleAssignment> {
    return this.service.createRoleAssignment(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Suspende o revoca un cargo' })
  @ApiStandardResponse(RoleAssignment, HttpStatus.OK, 'Cargo actualizado')
  updateRoleAssignmentStatus(
    @Param('id', ParseUUIDPipe) roleAssignmentId: string,
    @Body() dto: UpdateRoleAssignmentStatusRequest,
  ): Promise<RoleAssignment> {
    return this.service.updateRoleAssignmentStatus(roleAssignmentId, dto);
  }
}
