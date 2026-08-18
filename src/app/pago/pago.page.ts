import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, AlertController } from '@ionic/angular/standalone';
import { Firestore, doc, updateDoc, collection, addDoc } from '@angular/fire/firestore';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-pago',
  templateUrl: './pago.page.html',
  styleUrls: ['./pago.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonContent, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonButtons, 
    IonMenuButton, 
    IonButton
  ]
})
export class PagoPage implements OnInit {
  data: any;
  currentDate: string = '';

  constructor(
    private router: Router,
    private firestore: Firestore,
    private alertController: AlertController
  ) {
    const navigation = this.router.getCurrentNavigation();
    this.data = navigation?.extras?.state;

    if (!this.data) {
      const savedData = localStorage.getItem('currentLoanPayment');
      if (savedData) {
        this.data = JSON.parse(savedData);
      }
    }
  }

  ngOnInit() {
    if (!this.data) {
      this.router.navigate(['/clientes']);
      return;
    }

    if (this.data.pagosRegistrados === undefined) {
      this.data.pagosRegistrados = 0;
    }

    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate = new Date().toLocaleDateString('es-DO', options);
  }

  // 1. Muestra la alerta dinámica de Sí / No antes de procesar el pago
  async confirmarRegistroPago() {
    if (this.data.pagosRegistrados >= this.data.totalInstallments) {
      const alert = await this.alertController.create({
        header: 'Préstamo Completado',
        message: 'Este préstamo ya ha pagado todas sus cuotas.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const proximaCuota = this.data.pagosRegistrados + 1;

    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: `¿Desea registrar el pago de la cuota ${proximaCuota} de ${this.data.totalInstallments} para ${this.data.clientName}?`,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Pago cancelado');
          }
        },
        {
          text: 'Sí, Registrar',
          handler: async () => {
            await this.ejecutarRegistroYPDF();
          }
        }
      ]
    });

    await alert.present();
  }

  // 2. Ejecuta el incremento, guarda en Firebase, actualiza el historial de recibos y genera el PDF
  async ejecutarRegistroYPDF() {
    this.data.pagosRegistrados++;
    const fechaPago = new Date().toISOString();

    if (this.data.id) {
      try {
        // Actualiza el contador general en el documento del préstamo
        const loanDocRef = doc(this.firestore, 'loans', this.data.id);
        await updateDoc(loanDocRef, {
          pagosRegistrados: this.data.pagosRegistrados
        });

        // Opcional: Guarda un registro independiente del recibo/pago en una subcolección o colección de 'pagos'
        const pagosRef = collection(this.firestore, 'pagos');
        await addDoc(pagosRef, {
          loanId: this.data.id,
          clientName: this.data.clientName,
          clientCedula: this.data.clientCedula,
          cuotaNumero: this.data.pagosRegistrados,
          totalCuotas: this.data.totalInstallments,
          montoPagado: this.data.installmentAmount,
          fecha: fechaPago
        });

      } catch (error) {
        console.error('Error al registrar el pago en Firebase:', error);
      }
    }

    localStorage.setItem('currentLoanPayment', JSON.stringify(this.data));
    await this.generarYCompartirPDFRecibo();
  }

  // 3. Genera el recibo en PDF y abre las opciones de compartir por WhatsApp
  async generarYCompartirPDFRecibo() {
    const element = document.getElementById('receipt-content');
    const opt = {
      margin: 10,
      filename: `Recibo_Pago_${this.data.clientName}_Cuota_${this.data.pagosRegistrados}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const pdfBlob = await (html2pdf() as any).from(element).set(opt).output('blob');
    const file = new File([pdfBlob], `Recibo_Cuota_${this.data.pagosRegistrados}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Recibo de Pago - Préstamos Mena',
        text: `Hola ${this.data.clientName}, aquí tienes tu recibo de pago correspondiente a la cuota ${this.data.pagosRegistrados} de ${this.data.totalInstallments}.`
      });
    } else {
      (html2pdf() as any).from(element).set(opt).save();
    }
  }

  printReceipt() {
    window.print();
  }

  goBack() {
    this.router.navigate(['/clientes']);
  }
}