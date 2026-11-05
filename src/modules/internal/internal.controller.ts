import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { InternalAuthorizeRequest } from './dto/internal-authorize-request.dto';
import { InternalAuthorizeResponse } from './dto/internal-authorize-response.dto';
import { InternalService } from './internal.service';

@ApiTags('Internal')
@Controller('internal')
export class InternalController {
  constructor(private readonly service: InternalService) {}

  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resuelve si un usuario puede ejecutar una acción sobre un recurso' })
  @ApiStandardResponse(InternalAuthorizeResponse, HttpStatus.OK, 'Decisión de autorización')
  internalAuthorize(@Body() dto: InternalAuthorizeRequest): Promise<InternalAuthorizeResponse> {
    return this.service.internalAuthorize(dto);
  }
}
