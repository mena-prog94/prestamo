import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { 
  IonApp, 
  IonMenu, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonItem, 
  IonIcon,
  IonLabel, 
  IonRouterOutlet,
  MenuController,
  AlertController // 1. Importar AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, logOutOutline } from 'ionicons/icons'; // 2. Importar icono de salida
import * as LiveUpdates from '@capacitor/live-updates';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    IonApp, 
    IonMenu, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonList, 
    IonItem, 
    IonIcon,
    IonLabel, 
    IonRouterOutlet
  ],
})
export class AppComponent {
  constructor(
    private menuCtrl: MenuController,
    private alertController: AlertController, // 3. Inyectar AlertController
    private router: Router // Inyectar Router para redirigir al salir
  ) {
    // Registrar los iconos que se usan en el menú
    addIcons({ receiptOutline, logOutOutline });
  }
  async ngOnInit() {
    await this.syncWithAppflow();
  }
  async syncWithAppflow() {
    try {
      const update = await LiveUpdates.sync();
      // activeApplicationPathChanged es true si se descargó una nueva actualización
      if (update.activeApplicationPathChanged) {
        console.log('Nueva actualización aplicada correctamente.');
        
        // Opcional: puedes forzar la recarga de la app si lo requieres inmediatamente
        // await LiveUpdates.reload();
      } else {
        console.log('La aplicación ya está actualizada con la última versión.');
      }
    } catch (error) {
      console.error('Error al sincronizar con Live Updates:', error);
    }
  }

  cerrarMenu() {
    this.menuCtrl.close();
  }

  // 4. Mostrar alerta de confirmación
  async confirmarCerrarSesion() {
    this.cerrarMenu(); // Cierra el menú lateral primero

    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de la aplicación?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Sí',
          handler: () => {
            this.cerrarSesionAccion();
          }
        }
      ]
    });

    await alert.present();
  }

  // 5. Lógica para limpiar la sesión y redirigir
  cerrarSesionAccion() {
    // Aquí limpias tu almacenamiento o tokens si usas (ej. localStorage.clear())
    // localStorage.removeItem('token');
    
    // Redirige al usuario a la pantalla de login (cambia '/login' por tu ruta real)
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}