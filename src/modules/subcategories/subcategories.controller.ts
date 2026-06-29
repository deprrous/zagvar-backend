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
import { Role } from '../../common/types/auth.types';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { MoveSubcategoryProductsDto } from './dto/move-products.dto';
import { QuerySubcategoryDto } from './dto/query-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { SubcategoriesService } from './subcategories.service';

// Reads are open to shop admins (they need subcategories to tag products);
// writes stay super-admin-only via per-route @Roles overrides.
@ApiTags('subcategories (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin, Role.ShopAdmin)
@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post()
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Create a subcategory (super admin)' })
  create(@Body() dto: CreateSubcategoryDto) {
    return this.subcategoriesService.create(dto);
  }

  @Post('move-products')
  @Roles(Role.SuperAdmin)
  @ApiOperation({
    summary:
      'Move all products from one subcategory to another (super admin). ' +
      'The source subcategory is removed from each affected product.',
  })
  moveProducts(@Body() dto: MoveSubcategoryProductsDto) {
    return this.subcategoriesService.moveProducts(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List subcategories (optionally by category)' })
  findAll(@Query() query: QuerySubcategoryDto) {
    return this.subcategoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subcategory by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subcategoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Update a subcategory (super admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubcategoryDto,
  ) {
    return this.subcategoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Delete a subcategory (super admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subcategoriesService.remove(id);
  }
}
