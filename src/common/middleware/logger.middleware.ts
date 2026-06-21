import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/** Logs each request with method, path, status code and duration. */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const ms = Date.now() - startedAt;
      const { statusCode } = res;
      const message = `${method} ${originalUrl} ${statusCode} ${ms}ms`;
      if (statusCode >= 500) this.logger.error(message);
      else if (statusCode >= 400) this.logger.warn(message);
      else this.logger.log(message);
    });

    next();
  }
}
