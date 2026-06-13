import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorMessage, ErrorType } from '../../../common/enum/error-type.enum';
import { ApiKeyService } from '../api-key.service';
import { IS_API_KEY_OPTIONAL } from '../decorators/api-key-optional.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 🔐 Skip API key guard for WebSocket connections
    if (context.getType() === 'ws') {
      return true;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      IS_API_KEY_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );

    const request = context
      .switchToHttp()
      .getRequest<import('express').Request>();
    const apiKeyHeader = (request.headers['x-api-key'] as string) || '';
    const apiKeyUrl = (request.query['x-api-key'] as string) || '';

    const apiKey = apiKeyHeader || apiKeyUrl;

    // If API key is optional and not provided, allow access
    if (isOptional && !apiKey) {
      return true;
    }

    if (!apiKey) {
      throw new UnauthorizedException(ErrorMessage[ErrorType.MissingApiKey]);
    }

    const isValid = await this.apiKeyService.validateApiKey(apiKey);

    if (!isValid) {
      throw new UnauthorizedException(ErrorMessage[ErrorType.InvalidApiKey]);
    }

    return true;
  }
}
