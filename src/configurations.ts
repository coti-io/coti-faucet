export const corsConfig = {
  origin: [
    'http://localhost:3000',
    'https://pay-dev.coti.io',
    'https://pay.coti.io',
    '*',
  ],
  credentials: true,
};

export const appModuleConfig = {
  cors: corsConfig,
};
