export type PaymentMethodCredentialField = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'textarea';
  required?: boolean;
  placeholder?: string;
  helperText?: string;
};

export type PaymentMethodProviderTemplate = {
  provider: string;
  label: string;
  category: 'manual' | 'bank' | 'mobile_banking' | 'gateway' | 'custom';
  defaultMode: 'manual' | 'sandbox' | 'live';
  description: string;
  credentialFields: PaymentMethodCredentialField[];
};

export const PAYMENT_METHOD_TEMPLATES: PaymentMethodProviderTemplate[] = [
  {
    provider: 'cash',
    label: 'Cash',
    category: 'manual',
    defaultMode: 'manual',
    description: 'Collect payment over the counter and record it manually.',
    credentialFields: [],
  },
  {
    provider: 'bank_transfer',
    label: 'Bank Transfer',
    category: 'bank',
    defaultMode: 'manual',
    description: 'Publish school bank account details for deposits or transfers.',
    credentialFields: [
      { key: 'bankName', label: 'Bank Name', type: 'text', required: true },
      { key: 'accountName', label: 'Account Name', type: 'text', required: true },
      { key: 'accountNumber', label: 'Account Number', type: 'text', required: true },
      { key: 'branchName', label: 'Branch Name', type: 'text' },
      { key: 'routingNumber', label: 'Routing Number', type: 'text' },
      { key: 'swiftCode', label: 'SWIFT Code', type: 'text' },
    ],
  },
  {
    provider: 'bkash',
    label: 'bKash',
    category: 'mobile_banking',
    defaultMode: 'sandbox',
    description: 'Use bKash merchant payment credentials for online collections.',
    credentialFields: [
      { key: 'merchantNumber', label: 'Merchant Number', type: 'text', required: true },
      { key: 'appKey', label: 'App Key', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'callbackUrl', label: 'Callback URL', type: 'url' },
    ],
  },
  {
    provider: 'nagad',
    label: 'Nagad',
    category: 'mobile_banking',
    defaultMode: 'sandbox',
    description: 'Use Nagad merchant API credentials for online collections.',
    credentialFields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'merchantNumber', label: 'Merchant Number', type: 'text' },
      { key: 'publicKey', label: 'Public Key', type: 'textarea', required: true },
      { key: 'privateKey', label: 'Private Key', type: 'textarea', required: true },
      { key: 'callbackUrl', label: 'Callback URL', type: 'url' },
    ],
  },
  {
    provider: 'rocket',
    label: 'Rocket',
    category: 'mobile_banking',
    defaultMode: 'manual',
    description: 'Record Rocket merchant or biller payment details.',
    credentialFields: [
      { key: 'merchantNumber', label: 'Merchant Number', type: 'text', required: true },
      { key: 'billerId', label: 'Biller ID', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ],
  },
  {
    provider: 'sslcommerz',
    label: 'SSLCommerz',
    category: 'gateway',
    defaultMode: 'sandbox',
    description: 'Use SSLCommerz store credentials for cards, wallets, and bank payments.',
    credentialFields: [
      { key: 'storeId', label: 'Store ID', type: 'text', required: true },
      { key: 'storePassword', label: 'Store Password', type: 'password', required: true },
      {
        key: 'successUrl',
        label: 'Success URL',
        type: 'url',
        placeholder: 'Leave blank to use the system success URL',
        helperText: 'Optional. The backend uses the system default if this is empty.',
      },
      {
        key: 'failUrl',
        label: 'Fail URL',
        type: 'url',
        placeholder: 'Leave blank to use the system failure URL',
        helperText: 'Optional. The backend uses the system default if this is empty.',
      },
      {
        key: 'cancelUrl',
        label: 'Cancel URL',
        type: 'url',
        placeholder: 'Leave blank to use the system cancel URL',
        helperText: 'Optional. The backend uses the system default if this is empty.',
      },
      {
        key: 'ipnUrl',
        label: 'IPN URL',
        type: 'url',
        placeholder: 'Leave blank to use the system IPN URL',
        helperText: 'Optional. The IPN URL should point to the backend. The system default is used if empty.',
      },
    ],
  },
  {
    provider: 'custom',
    label: 'Custom Method',
    category: 'custom',
    defaultMode: 'manual',
    description: 'Use for a school-specific manual or local payment process.',
    credentialFields: [
      { key: 'details', label: 'Payment Details', type: 'textarea' },
      { key: 'referenceFormat', label: 'Reference Format', type: 'text' },
    ],
  },
];

export function getPaymentMethodTemplate(provider: string) {
  return PAYMENT_METHOD_TEMPLATES.find((item) => item.provider === provider);
}
