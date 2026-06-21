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
import { CreateShopContactDto } from './dto/create-shop-contact.dto';
import { UpdateShopContactDto } from './dto/update-shop-contact.dto';
import { ShopContactsService } from './shop-contacts.service';

@ApiTags('shop contacts (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin, Role.ShopAdmin)
@CheckOwnership(OwnedResource.Shop, 'shopId')
@Controller('shops/:shopId/contacts')
export class ShopContactsController {
  constructor(private readonly contactsService: ShopContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a contact to a shop' })
  create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateShopContactDto,
  ) {
    return this.contactsService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List a shop's contacts" })
  findAll(@Param('shopId', ParseUUIDPipe) shopId: string) {
    return this.contactsService.findAllForShop(shopId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shop contact' })
  update(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopContactDto,
  ) {
    return this.contactsService.update(shopId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shop contact' })
  remove(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contactsService.remove(shopId, id);
  }
}
