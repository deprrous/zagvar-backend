import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [FileModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
