import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TransferOwnershipRequest } from './dto/transfer-ownership-request.dto';
import { TransferOwnershipResponse } from './dto/transfer-ownership-response.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Patch(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transferir la titularidad de la organización' })
  @ApiStandardResponse(TransferOwnershipResponse, HttpStatus.OK, 'Titularidad transferida')
  transferOwnership(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() dto: TransferOwnershipRequest,
  ): Promise<TransferOwnershipResponse> {
    return this.service.transferOwnership(organizationId, dto);
  }
}
