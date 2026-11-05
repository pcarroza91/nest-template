import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreatePermissionOverrideRequest } from './dto/create-permission-override-request.dto';
import { PermissionOverride } from './dto/permission-override.dto';
import { PermissionOverridesService } from './permission-overrides.service';

@ApiTags('PermissionOverrides')
@ApiBearerAuth()
@Controller('permission-overrides')
@UseGuards(JwtAuthGuard)
export class PermissionOverridesController {
  constructor(private readonly service: PermissionOverridesService) {}

  @Post()
  @ApiOperation({ summary: 'Otorga una excepción de permiso puntual' })
  @ApiStandardResponse(PermissionOverride, HttpStatus.CREATED, 'Excepción otorgada')
  createPermissionOverride(
    @Body() dto: CreatePermissionOverrideRequest,
  ): Promise<PermissionOverride> {
    return this.service.createPermissionOverride(dto);
  }
}
