export type SendMailJob = {
  scope?: 'tenant' | 'platform';
  schema?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};
