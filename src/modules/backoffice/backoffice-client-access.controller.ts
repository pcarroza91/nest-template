import { Body, Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { BackofficeService } from './backoffice.service';
import { BackofficeClientAccessResponse } from './dto/backoffice-client-access-response.dto';
import { CreateBackofficeClientAccessRequest } from './dto/create-backoffice-client-access-request.dto';

@ApiTags('Backoffice')
@ApiBearerAuth()
@Controller('backoffice-client-access')
@UseGuards(JwtAuthGuard)
export class BackofficeClientAccessController {
  constructor(private readonly service: BackofficeService) {}

  @Post()
  @ApiOperation({ summary: 'Restringe la cartera de clientes de un empleado' })
  @ApiStandardResponse(BackofficeClientAccessResponse, HttpStatus.CREATED, 'Cartera restringida')
  createBackofficeClientAccess(
    @Body() dto: CreateBackofficeClientAccessRequest,
  ): Promise<BackofficeClientAccessResponse> {
    return this.service.createBackofficeClientAccess(dto);
  }
}
