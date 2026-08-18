import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonItem, 
  IonInput, 
  IonButton, 
  IonIcon,
  AlertController // <-- 1. Importar AlertController
} from '@ionic/angular/standalone';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AuthService } from '../../services/auth';

// Importa los iconos de ionicons
import { addIcons } from 'ionicons';
import { walletOutline, mailOutline, lockClosedOutline, callOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonItem, 
    IonInput, 
    IonButton, 
    IonIcon
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginPage {
  email: string = '';
  password: string = '';

  constructor(
    private authService: AuthService, 
    private router: Router,
    private alertController: AlertController // <-- 2. Inyectar AlertController
  ) {
    // Registrar los iconos correctamente
    addIcons({
      walletOutline, 
      mailOutline, 
      lockClosedOutline, 
      callOutline
    });
  }

  // Función para mostrar la alerta centrada
  async showAlert(header: string, message: string, callback?: () => void) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: [{
        text: 'Aceptar',
        handler: () => {
          if (callback) callback();
        }
      }]
    });
    await alert.present();
  }

  async onLogin() {
    try {
      await this.authService.login(this.email, this.password);
      
      // Muestra la alerta centrada y al hacer clic en "Aceptar" navega a la página principal
      await this.showAlert('¡Bienvenido!', 'Jovanny', () => {
        this.router.navigate(['/principal']);
      });

    } catch (e: any) {
      // Muestra el error centrado si las credenciales fallan
      await this.showAlert('Error al iniciar sesión', e.message);
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}