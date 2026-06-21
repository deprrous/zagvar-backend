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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CheckOwnership,
  OwnedResource,
} from '../../common/decorators/ownership.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, type AuthUser } from '../../common/types/auth.types';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin, Role.ShopAdmin)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a product (shop admins create within their own shop)',
  })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.productsService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List products. Shop admins only see their own shop.',
  })
  findAll(@Query() query: QueryProductDto, @CurrentUser() user: AuthUser) {
    if (user.role === Role.ShopAdmin) {
      query.shopId = user.shopId; // hard scope to the owning shop
    }
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @CheckOwnership(OwnedResource.Product)
  @ApiOperation({ summary: 'Get a product by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @CheckOwnership(OwnedResource.Product)
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @CheckOwnership(OwnedResource.Product)
  @ApiOperation({ summary: 'Delete a product' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
