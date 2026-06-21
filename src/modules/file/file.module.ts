import { Global, Module } from '@nestjs/common';
import { CloudflareService } from './cf.service';

// Global so CloudflareService can be injected by the storage interceptor and by
// any service that persists image keys without each module re-importing it.
@Global()
@Module({
  providers: [CloudflareService],
  exports: [CloudflareService],
})
export class FileModule {}
