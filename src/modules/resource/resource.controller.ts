import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from 'src/common/decorators/api-paginated-response.decorator';
import { ApiStandardResponse } from 'src/common/decorators/api-standard-response.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { PaginatedResultDto } from 'src/common/dto/paginated-result.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { FindResourcesQueryDto } from './dto/find-resources-query.dto';
import { ResourceCalculationDto, ResourceResponseDto } from './dto/resource-response.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourceService } from './resource.service';

@ApiTags('resources')
@Controller('resources')
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un recurso' })
  @ApiStandardResponse(ResourceResponseDto, HttpStatus.CREATED, 'Recurso creado')
  @ResponseMessage('Recurso creado correctamente')
  create(@Body() dto: CreateResourceDto): Promise<ResourceResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista recursos con filtros y paginación' })
  @ApiPaginatedResponse(ResourceResponseDto)
  findAll(@Query() query: FindResourcesQueryDto): Promise<PaginatedResultDto<ResourceResponseDto>> {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un recurso por id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiStandardResponse(ResourceResponseDto)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResourceResponseDto> {
    return this.service.findOne(id);
  }

  @Get(':id/calculation')
  @ApiOperation({ summary: 'Ejecuta las reglas de negocio sobre el recurso' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiStandardResponse(ResourceCalculationDto)
  calculate(@Param('id', ParseUUIDPipe) id: string): Promise<ResourceCalculationDto> {
    return this.service.calculate(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un recurso' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiStandardResponse(ResourceResponseDto)
  @ResponseMessage('Recurso actualizado correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ): Promise<ResourceResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina (soft delete) un recurso' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ResponseMessage('Recurso eliminado correctamente')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
