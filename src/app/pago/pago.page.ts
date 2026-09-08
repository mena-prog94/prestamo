// pago.page.ts
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
            await this.ejecutarRegistroYPermanecer();
          }
        }
      ]
    });

    await alert.present();
  }

  // 2. Ejecuta el incremento, guarda en Firebase, actualiza localStorage y PERMANECE en la misma página
  async ejecutarRegistroYPermanecer() {
    this.data.pagosRegistrados++;
    const fechaPago = new Date().toISOString();

    if (this.data.id) {
      try {
        const loanDocRef = doc(this.firestore, 'loans', this.data.id);
        await updateDoc(loanDocRef, {
          pagosRegistrados: this.data.pagosRegistrados
        });

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

    // Actualizamos el estado local para reflejar el nuevo número de cuota pagada al instante
    localStorage.setItem('currentLoanPayment', JSON.stringify(this.data));

    const alert = await this.alertController.create({
      header: '¡Pago Registrado!',
      message: `La cuota ${this.data.pagosRegistrados} de ${this.data.totalInstallments} se ha registrado correctamente.`,
      buttons: ['OK']
    });
    await alert.present();
  }

  // 3. Genera el PDF y abre la interfaz nativa del sistema para compartir por WhatsApp
  async compartirPdfWhatsApp() {
    const element = document.getElementById('receipt-content');
    const opt = {
      margin: 10,
      filename: `Recibo_Pago_${this.data.clientName}_Cuota_${this.data.pagosRegistrados}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await (html2pdf() as any).from(element).set(opt).output('blob');
      const file = new File([pdfBlob], `Recibo_Cuota_${this.data.pagosRegistrados}.pdf`, { type: 'application/pdf' });

      const mensajeTexto = `Hola *${this.data.clientName}*, aquí tienes tu recibo de pago correspondiente a la cuota ${this.data.pagosRegistrados} de ${this.data.totalInstallments} por un monto de RD$ ${this.data.installmentAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}. - *Préstamos Mena*`;

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Recibo de Pago - Préstamos Mena',
          text: mensajeTexto
        });
      } else {
        // Fallback si el dispositivo no soporta Web Share API con archivos
        (html2pdf() as any).from(element).set(opt).save();
        
        const telefonoLimpio = this.data.clientPhone ? this.data.clientPhone.replace(/\D/g, '') : '';
        const urlWhatsApp = `https://api.whatsapp.com/send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensajeTexto)}`;
        window.open(urlWhatsApp, '_blank');
      }
    } catch (error) {
      console.error('Error al generar o compartir el PDF:', error);
    }
  }

  printReceipt() {
    window.print();
  }

  renovarPrestamo() {
    const datosClienteParaRenovar = {
      clientName: this.data.clientName,
      clientCedula: this.data.clientCedula,
      clientPhone: this.data.clientPhone,
      clientAddress: this.data.clientAddress
    };

    localStorage.setItem('datosRenovacion', JSON.stringify(datosClienteParaRenovar));
    this.router.navigate(['/principal']);
  }

  goBack() {
    this.router.navigate(['/clientes']);
  }
}