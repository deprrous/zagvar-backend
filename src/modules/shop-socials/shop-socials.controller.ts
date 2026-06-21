import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CheckOwnership,
  OwnedResource,
} from '../../common/decorators/ownership.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/auth.types';
import { CreateShopSocialDto } from './dto/create-shop-social.dto';
import { UpdateShopSocialDto } from './dto/update-shop-social.dto';
import { ShopSocialsService } from './shop-socials.service';

@ApiTags('shop socials (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin, Role.ShopAdmin)
@CheckOwnership(OwnedResource.Shop, 'shopId')
@Controller('shops/:shopId/socials')
export class ShopSocialsController {
  constructor(private readonly socialsService: ShopSocialsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a social link to a shop' })
  create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateShopSocialDto,
  ) {
    return this.socialsService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a shop's social links" })
  findAll(@Param('shopId', ParseUUIDPipe) shopId: string) {
    return this.socialsService.findAllForShop(shopId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a social link' })
  update(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopSocialDto,
  ) {
    return this.socialsService.update(shopId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a social link' })
  remove(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.socialsService.remove(shopId, id);
  }
}
