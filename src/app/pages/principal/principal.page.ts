import { Component, OnInit } from '@angular/core';
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
export class PrincipalPage implements OnInit {
  clientName: string = '';
  clientCedula: string = '';
  clientPhone: string = '';
  clientAddress: string = '';
  
  loanAmount: number | null = null;
  loanType: string = 'semanal';
  customQuincenas: number | null = null;

  totalInterest: number = 0;
  totalToPay: number = 0;
  installmentAmount: number = 0;
  totalInstallments: number = 0;
  
  interestPercentage: number = 30;
  loanTypeLabel: string = 'semana';

  constructor(
    private alertController: AlertController,
    private router: Router,
    private firestore: Firestore
  ) {}

  ngOnInit() {}

  ionViewWillEnter() {
    const datosRenovacion = localStorage.getItem('datosRenovacion');
    if (datosRenovacion) {
      const cliente = JSON.parse(datosRenovacion);
      this.clientName = cliente.clientName || '';
      this.clientCedula = cliente.clientCedula || '';
      this.clientPhone = cliente.clientPhone || '';
      this.clientAddress = cliente.clientAddress || '';
      localStorage.removeItem('datosRenovacion');
    }
  }

  limpiarFormulario() {
    this.clientName = '';
    this.clientCedula = '';
    this.clientPhone = '';
    this.clientAddress = '';
    this.loanAmount = null;
    this.loanType = 'semanal';
    this.customQuincenas = null;
    this.totalInterest = 0;
    this.totalToPay = 0;
    this.installmentAmount = 0;
    this.totalInstallments = 0;
    this.interestPercentage = 30;
    this.loanTypeLabel = 'semana';
  }

  onLoanTypeChange() {
    if (this.loanType !== 'mas_quincenas') {
      this.customQuincenas = null;
    }
    this.calculateLoan();
  }

  calculateLoan() {
    if (!this.loanAmount || this.loanAmount <= 0) {
      this.totalInterest = 0;
      this.totalToPay = 0;
      this.installmentAmount = 0;
      this.totalInstallments = 0;
      return;
    }

    if (this.loanType === 'semanal') {
      this.interestPercentage = 30;
      this.totalInstallments = 13;
      this.loanTypeLabel = 'semana';
    } else if (this.loanType === 'quincenal') {
      this.interestPercentage = 30;
      this.totalInstallments = 7;
      this.loanTypeLabel = 'quincena';
    } else if (this.loanType === 'mas_quincenas') {
      this.interestPercentage = 35;
      this.totalInstallments = this.customQuincenas && this.customQuincenas > 0 ? this.customQuincenas : 0;
      this.loanTypeLabel = 'quincena';
    }

    this.totalInterest = this.loanAmount * (this.interestPercentage / 100);
    this.totalToPay = this.loanAmount + this.totalInterest;

    if (this.totalInstallments > 0) {
      this.installmentAmount = this.totalToPay / this.totalInstallments;
    } else {
      this.installmentAmount = 0;
    }
  }

  async saveAndGenerateContract() {
    if (this.loanType === 'mas_quincenas' && (!this.customQuincenas || this.customQuincenas <= 0)) {
      const alert = await this.alertController.create({
        header: 'Cantidad requerida',
        message: 'Por favor ingrese una cantidad válida de quincenas.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    if (!this.clientName || !this.clientCedula || !this.clientPhone || !this.clientAddress || !this.loanAmount) {
      const alert = await this.alertController.create({
        header: 'Campos incompletos',
        message: 'Por favor complete todos los campos obligatorios.',
        buttons: ['Aceptar']
      });
      await alert.present();
      return;
    }

    this.calculateLoan();

    const fechaActual = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
    const modalidadTexto = this.loanType === 'mas_quincenas' ? `${this.totalInstallments} Quincenas (Personalizadas)` : this.loanType;

    const contratoTexto = `CONTRATO DE PRÉSTAMO PERSONAL - PRÉSTAMOS MENA
    En la ciudad de Bonao, a fecha de hoy ${fechaActual}, se formaliza el préstamo con:
    PRESTAMISTA: Jovanny Mena, cédula 402-2311606-2.
    PRESTATARIO: ${this.clientName}, cédula ${this.clientCedula}, domicilio: ${this.clientAddress}.
    MONTO: RD$ ${this.loanAmount}.
    MODALIDAD: ${modalidadTexto}.
    TOTAL A PAGAR: RD$ ${this.totalToPay}.
    VALOR CUOTA: RD$ ${this.installmentAmount}.`;

    const loanData = {
      clientName: this.clientName,
      clientCedula: this.clientCedula,
      clientPhone: this.clientPhone,
      clientAddress: this.clientAddress,
      loanAmount: this.loanAmount,
      loanType: modalidadTexto,
      totalInterest: this.totalInterest,
      totalToPay: this.totalToPay,
      installmentAmount: this.installmentAmount,
      totalInstallments: this.totalInstallments,
      pagosRegistrados: 0, 
      contratoFirmado: contratoTexto,
      createdAt: new Date()
    };

    try {
      const loansRef = collection(this.firestore, 'loans');
      const docRef = await addDoc(loansRef, loanData);
      
      const alert = await this.alertController.create({
        header: '¡Guardado Exitoso!',
        message: 'El préstamo se ha registrado correctamente.',
        buttons: [
          {
            text: 'Aceptar',
            handler: () => {
              this.router.navigate(['/pago', docRef.id]);
              this.limpiarFormulario();
            }
          }
        ]
      });
      await alert.present();

    } catch (error) {
      console.error('Error al guardar en Firebase:', error);
      const alert = await this.alertController.create({
        header: 'Error',
        message: 'No se pudo guardar el préstamo. Intente de nuevo.',
        buttons: ['Aceptar']
      });
      await alert.present();
    }
  }
  
  async confirmarCerrarSesion() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir?',
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Sí', handler: () => this.router.navigate(['/login'], { replaceUrl: true }) }
      ]
    });
    await alert.present();
  }
}