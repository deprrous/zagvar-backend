import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Role } from '../../common/types/auth.types';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@ApiTags('banners (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin)
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a banner (super admin)' })
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List banners' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.bannersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a banner by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner (super admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner (super admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannersService.remove(id);
  }
}
