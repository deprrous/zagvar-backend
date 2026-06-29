import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnonId } from '../../common/decorators/anon-id.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LikesService } from './likes.service';

/**
 * Anonymous product likes. Every route is @Public() (no account required); the
 * visitor is identified solely by the `anon_id` cookie via the @AnonId()
 * decorator, which rejects the request when the cookie is missing.
 *
 * Routes live under `/products/:id/...` and `/likes/...`; they don't collide
 * with the admin ProductsController, which owns different method+path pairs.
 */
@ApiTags('likes')
@Public()
@Controller()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('products/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle the current visitor’s like on a product' })
  toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @AnonId() anonId: string,
  ) {
    return this.likesService.toggle(id, anonId);
  }

  @Get('products/:id/likes')
  @ApiOperation({ summary: 'Like count for a product + whether you liked it' })
  getForProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @AnonId() anonId: string,
  ) {
    return this.likesService.getForProduct(id, anonId);
  }

  @Get('likes/me')
  @ApiOperation({ summary: 'Product ids the current visitor has liked' })
  listMine(@AnonId() anonId: string) {
    return this.likesService.listMine(anonId);
  }

  @Get('likes/me/products')
  @ApiOperation({ summary: 'Full product objects the current visitor has liked' })
  listMineProducts(@AnonId() anonId: string) {
    return this.likesService.listMineProducts(anonId);
  }
}
