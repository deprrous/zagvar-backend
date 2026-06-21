import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CheckOwnership,
  OwnedResource,
} from '../../common/decorators/ownership.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, type AuthUser } from '../../common/types/auth.types';
import { CreateShopDto } from './dto/create-shop.dto';
import { QueryShopDto } from './dto/query-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopsService } from './shops.service';

@ApiTags('shops (admin)')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Create a shop (super admin)' })
  create(@Body() dto: CreateShopDto) {
    return this.shopsService.create(dto);
  }

  @Get()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'List shops (super admin)' })
  findAll(@Query() query: QueryShopDto) {
    return this.shopsService.findAll(query);
  }

  @Get('me')
  @Roles(Role.ShopAdmin)
  @ApiOperation({ summary: "Get the authenticated shop admin's own shop" })
  findMine(@CurrentUser() user: AuthUser) {
    if (!user.shopId) throw new ForbiddenException('No shop associated');
    return this.shopsService.findOne(user.shopId);
  }

  @Get(':id')
  @Roles(Role.SuperAdmin, Role.ShopAdmin)
  @CheckOwnership(OwnedResource.Shop)
  @ApiOperation({ summary: 'Get a shop by id (super admin, or owning shop admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin, Role.ShopAdmin)
  @CheckOwnership(OwnedResource.Shop)
  @ApiOperation({
    summary: 'Update a shop. Shop admins may edit profile fields only.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.shopsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Delete a shop (super admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.remove(id);
  }
}
