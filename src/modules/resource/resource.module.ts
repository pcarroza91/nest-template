import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceBusiness } from './business/resource.business';
import { Resource } from './entities/resource.entity';
import { ResourceMapper } from './mappers/resource.mapper';
import { ResourceRepository } from './repositories/resource.repository';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';

@Module({
  imports: [TypeOrmModule.forFeature([Resource])],
  controllers: [ResourceController],
  providers: [ResourceService, ResourceBusiness, ResourceRepository, ResourceMapper],
  exports: [ResourceService],
})
export class ResourceModule {}
