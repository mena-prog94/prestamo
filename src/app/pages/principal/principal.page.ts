import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonItem, 
  IonInput, 
  IonSelect, 
  IonSelectOption, 
  IonButton,
  AlertController 
} from '@ionic/angular/standalone';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

// Importar herramientas de Firebase Firestore
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-principal',
  templateUrl: './principal.page.html',
  styleUrls: ['./principal.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonItem, 
    IonInput, 
    IonSelect, 
    IonSelectOption, 
    IonButton
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PrincipalPage {
  clientName: string = '';
  clientCedula: string = '';
  clientPhone: string = '';
  clientAddress: string = '';
  
  loanAmount: number | null = null;
  loanType: string = 'semanal';

  totalInterest: number = 0;
  totalToPay: number = 0;
  installmentAmount: number = 0;
  totalInstallments: number = 0;

  constructor(
    private alertController: AlertController,
    private router: Router,
    private firestore: Firestore
  ) {}
  

  calculateLoan() {
    if (!this.loanAmount || this.loanAmount <= 0) {
      this.totalInterest = 0;
      this.totalToPay = 0;
      this.installmentAmount = 0;
      this.totalInstallments = 0;
      return;
    }

    // 30% de interés total
    this.totalInterest = this.loanAmount * 0.30;
    this.totalToPay = this.loanAmount + this.totalInterest;

    if (this.loanType === 'semanal') {
      this.totalInstallments = 13; 
    } else {
      this.totalInstallments = 7;  
    }

    this.installmentAmount = this.totalToPay / this.totalInstallments;
  }

  async saveAndGenerateContract() {
    if (!this.clientName || !this.clientCedula || !this.clientPhone || !this.clientAddress || !this.loanAmount) {
      const alert = await this.alertController.create({
        header: 'Campos incompletos',
        message: 'Por favor complete todos los datos del cliente, dirección y el monto.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    this.calculateLoan();

    const fechaActual = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
    const contratoTexto = `CONTRATO DE PRÉSTAMO PERSONAL - PRÉSTAMOS MENA
    En la ciudad de Bonao, a fecha de hoy ${fechaActual}, se formaliza el préstamo con:
    PRESTAMISTA: Jovanny Mena, cédula 402-2311606-2.
    PRESTATARIO: ${this.clientName}, cédula ${this.clientCedula}, domicilio: ${this.clientAddress}.
    MONTO: RD$ ${this.loanAmount}.
    MODALIDAD: ${this.loanType}.
    TOTAL A PAGAR: RD$ ${this.totalToPay}.
    VALOR CUOTA: RD$ ${this.installmentAmount}.`;

    const loanData = {
      clientName: this.clientName,
      clientCedula: this.clientCedula,
      clientPhone: this.clientPhone,
      clientAddress: this.clientAddress,
      loanAmount: this.loanAmount,
      loanType: this.loanType,
      totalInterest: this.totalInterest,
      totalToPay: this.totalToPay,
      installmentAmount: this.installmentAmount,
      totalInstallments: this.totalInstallments,
      pagosRegistrados: 0, // Inicializa los pagos en 0 para el control de cuotas
      contratoFirmado: contratoTexto,
      createdAt: new Date()
    };

    try {
      // 1. Guardar en Firestore
      const loansRef = collection(this.firestore, 'loans');
      const docRef = await addDoc(loansRef, loanData);
      
      // Asignar el ID generado por Firebase al objeto local
      const loanDataWithId = { id: docRef.id, ...loanData };

      // 2. Guardar en localStorage para garantizar que la página de contrato o pagos los reciba sin errores
      localStorage.setItem('currentLoanContract', JSON.stringify(loanDataWithId));

      // 3. Alerta de éxito
      const alert = await this.alertController.create({
        header: '¡Guardado Exitoso!',
        message: 'El préstamo se ha registrado correctamente en Firebase.',
        buttons: [
          {
            text: 'Aceptar',
            handler: () => {
              // 4. Navegar a la página del contrato
              this.router.navigate(['/contrato',, docRef.id]);

              // 5. Limpiar campos
              this.clientName = '';
              this.clientCedula = '';
              this.clientPhone = '';
              this.clientAddress = '';
              this.loanAmount = null;
              this.loanType = 'semanal';
              this.totalInterest = 0;
              this.totalToPay = 0;
              this.installmentAmount = 0;
              this.totalInstallments = 0;
            }
          }
        ]
      });
      await alert.present();

    } catch (error) {
      console.error('Error al guardar en Firebase:', error);
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se pudo guardar el préstamo en la base de datos. Intente de nuevo.',
        buttons: ['Aceptar']
      });
      await alert.present();
    }
  }
  
  // 4. Mostrar alerta de confirmación
  async confirmarCerrarSesion() {
    

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
