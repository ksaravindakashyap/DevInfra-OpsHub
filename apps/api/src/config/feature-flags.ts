export const features = {
  DEMO_MODE: process.env.DEMO_MODE === '1',
  ALLOW_TEST_LOGIN: process.env.ALLOW_TEST_LOGIN === '1',
  USE_MOCK_PROVIDER: process.env.USE_MOCK_PROVIDER === '1',
  DISABLE_SLACK: process.env.DISABLE_SLACK === '1',
} as const;

export type FeatureFlag = keyof typeof features;
