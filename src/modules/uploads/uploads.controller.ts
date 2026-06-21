import {
  BadRequestException,
  Controller,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/auth.types';
import { CloudflareService } from '../file/cf.service';

/**
 * Generic image upload to R2 for any admin. Used by the admin app for banner
 * images and shop logo/cover (product images have their own nested endpoint).
 * Returns the durable public URL the caller then stores on the target record.
 */
@ApiTags('uploads (admin)')
@ApiBearerAuth()
@Roles(Role.SuperAdmin, Role.ShopAdmin)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudflare: CloudflareService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image file to storage (R2)' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('folder') folder?: string,
  ): Promise<{ url: string | null | undefined; key: string }> {
    if (!file) throw new BadRequestException('No file provided');
    const safeFolder = folder?.replace(/[^a-z0-9-]/gi, '') || undefined;
    const { key } = await this.cloudflare.uploadFile(file, safeFolder);
    // Persist only `key`; `url` is a signed URL for immediate preview. The
    // record write normalizes whichever the client sends back down to the key.
    return { url: await this.cloudflare.toDisplayUrl(key), key };
  }
}
