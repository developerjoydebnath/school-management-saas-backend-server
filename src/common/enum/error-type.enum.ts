export enum ErrorType {
  MissingApiKey = 'MissingApiKey',
  InvalidApiKey = 'InvalidApiKey',
}

export const ErrorMessage = {
  [ErrorType.MissingApiKey]: 'API Key is missing',
  [ErrorType.InvalidApiKey]: 'Invalid API Key provided',
};
