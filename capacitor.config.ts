import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Prestamos',
  webDir: 'www',
  plugins: {
    LiveUpdates: {
      appId: '437f73f4', // Reemplaza con tu App ID real de Appflow
      channel: 'Production', // El canal desde donde se descargarán las actualizaciones
      autoUpdateMethod: 'background', // Cómo se aplicarán ('background' o 'kill')
      maxVersions: 2
    }
  }
};

export default config;
