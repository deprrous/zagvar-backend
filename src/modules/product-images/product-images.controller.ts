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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CheckOwnership,
  OwnedResource,
} from '../../common/decorators/ownership.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/auth.types';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductImagesService } from './product-images.service';

@ApiTags('product images (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin, Role.ShopAdmin)
@CheckOwnership(OwnedResource.Product, 'productId')
@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private readonly imagesService: ProductImagesService) {}

  @Post()
  @ApiOperation({ summary: 'Attach an image by URL' })
  create(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.imagesService.create(productId, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image file to storage (R2)' })
  upload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('position') position?: string,
  ) {
    return this.imagesService.upload(
      productId,
      file,
      position ? Number(position) : undefined,
    );
  }

  @Get()
  @ApiOperation({ summary: "List a product's images" })
  findAll(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.imagesService.findAllForProduct(productId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an image (url/position)' })
  update(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.imagesService.update(productId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an image' })
  remove(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.imagesService.remove(productId, id);
  }
}
