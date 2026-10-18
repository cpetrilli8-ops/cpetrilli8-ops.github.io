import type { CapacitorConfig } from '@capacitor/cli';
import { APP_ID, APP_NAME } from './src/lib/app-identity';

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: APP_NAME,
  webDir: 'dist',
  backgroundColor: '#f7f1e9',
};

export default config;
