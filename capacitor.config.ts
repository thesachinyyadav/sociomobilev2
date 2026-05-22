import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.withsocio.app',
  appName: 'SOCIO',
  webDir: 'out',

  loggingBehavior: 'debug',

  server: {
    androidScheme: 'https',
    url: 'https://app.withsocio.com',
    allowNavigation: ['app.withsocio.com'],
    cleartext: false
  },

  android: {
    allowMixedContent: false,

    // IMPORTANT
    webContentsDebuggingEnabled: true
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },

    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },

    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff"
    }
  },
};

export default config;
