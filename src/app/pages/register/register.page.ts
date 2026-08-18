import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonItem, 
  IonInput, 
  IonButton,
  IonIcon,
  AlertController // <-- 1. Importar AlertController de Ionic
} from '@ionic/angular/standalone';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AuthService } from '../../services/auth';

// Importar iconos necesarios
import { addIcons } from 'ionicons';
import { personAddOutline, personOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage implements OnInit {
  name: string = '';
  email: string = '';
  password: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController // <-- 2. Inyectar el controlador de alertas
  ) { 
    // Registrar los iconos para la vista de registro
    addIcons({
      personAddOutline,
      personOutline,
      mailOutline,
      lockClosedOutline
    });
  }

  ngOnInit() {}

  // Función auxiliar para mostrar alertas centradas en la pantalla
  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: ['Aceptar'],
      cssClass: 'custom-center-alert' // Opcional para dar estilo personalizado si deseas
    });
    await alert.present();
  }

  async onRegister() {
    try {
      // Llamada real a tu AuthService para registrar en Firebase
      const userCredential = await this.authService.register(this.email, this.password);
      console.log('Usuario registrado con éxito:', userCredential.user);
      
      // Mostrar mensaje de éxito centrado
      await this.showAlert('¡Éxito!', 'Usuario registrado correctamente.');
      
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Error en el registro de Firebase:', error);
      
      // Mostrar mensaje de error centrado en la pantalla con el detalle de Firebase
      await this.showAlert('Error de Registro', error.message);
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}