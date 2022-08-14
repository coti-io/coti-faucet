export const corsConfig = {
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3006',
    'https://pay-dev.coti.io',
    'https://pay.coti.io',
    'https://pay-staging.coti.io',
    'https://treasury.coti.io',
    'https://treasury-dev.coti.io',
    'https://treasury-staging.coti.io',
    'https://treasury-app-foxnet.coti.io',
    'https://foxnet-wallet.coti.io',
    '*',
  ],
  credentials: true,
};

export const appModuleConfig = {
  cors: corsConfig,
};
