import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { QueryProductDto } from '../products/dto/query-product.dto';
import { ProductsService } from '../products/products.service';
import { PublicService } from './public.service';

@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly productsService: ProductsService,
  ) {}

  // --- shops -----------------------------------------------------------------

  @Get('shops')
  @ApiOperation({ summary: 'Browse active shops' })
  listShops(@Query() query: PaginationQueryDto) {
    return this.publicService.listShops(query);
  }

  @Get('shops/:slug')
  @ApiOperation({ summary: 'View a shop (with contacts, socials, products)' })
  getShop(@Param('slug') slug: string) {
    return this.publicService.getShopBySlug(slug);
  }

  // --- banners ---------------------------------------------------------------

  @Get('banners')
  @ApiOperation({ summary: 'List active banners (ordered by position)' })
  listBanners() {
    return this.publicService.listBanners();
  }

  // --- taxonomy --------------------------------------------------------------

  @Get('categories')
  @ApiOperation({ summary: 'List categories with subcategories' })
  listCategories() {
    return this.publicService.listCategories();
  }

  @Get('categories/:slug')
  @ApiOperation({ summary: 'View a category and its subcategories' })
  getCategory(@Param('slug') slug: string) {
    return this.publicService.getCategoryBySlug(slug);
  }

  // --- products --------------------------------------------------------------

  @Get('products')
  @ApiOperation({
    summary: 'Discover/filter/search products (active shops only)',
  })
  listProducts(@Query() query: QueryProductDto) {
    return this.productsService.findAllPublic(query);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'View product detail (increments click_count atomically)',
  })
  viewProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.viewPublic(id);
  }

  @Post('products/:id/click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a click (atomic single-column increment)' })
  click(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.incrementClick(id);
  }
}
