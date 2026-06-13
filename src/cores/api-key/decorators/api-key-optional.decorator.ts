import { SetMetadata } from '@nestjs/common';

export const IS_API_KEY_OPTIONAL = 'isApiKeyOptional';
export const ApiKeyOptional = () => SetMetadata(IS_API_KEY_OPTIONAL, true);
