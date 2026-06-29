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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/auth.types';
import { CreateShopAdminDto } from './dto/create-shop-admin.dto';
import { UpdateShopAdminDto } from './dto/update-shop-admin.dto';
import { ShopAdminsService } from './shop-admins.service';

@ApiTags('shop admins (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin)
@Controller('shop-admins')
export class ShopAdminsController {
  constructor(private readonly shopAdminsService: ShopAdminsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shop admin (super admin)' })
  create(@Body() dto: CreateShopAdminDto) {
    return this.shopAdminsService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'shopId', required: false })
  @ApiOperation({ summary: 'List shop admins (super admin)' })
  findAll(
    @Query() query: PaginationQueryDto,
    @Query('shopId') shopId?: string,
  ) {
    return this.shopAdminsService.findAll(query, shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shop admin by id (super admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopAdminsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shop admin (super admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopAdminDto,
  ) {
    return this.shopAdminsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shop admin (super admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopAdminsService.remove(id);
  }
}
