import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonButton, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, AlertController } from '@ionic/angular/standalone';
import { Firestore, doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
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
  loanId: string | null = null;
  data: any = null;
  historialPagos: any[] = [];
  currentDate: string = '';
  isSubmitting: boolean = false; // Bandera para evitar doble clic

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firestore: Firestore,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    this.loanId = this.route.snapshot.paramMap.get('id');
    
    if (!this.loanId) {
      this.router.navigate(['/clientes']);
      return;
    }

    await this.cargarDatosPrestamo();
    
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate = new Date().toLocaleDateString('es-DO', options);
  }

  async cargarDatosPrestamo() {
    try {
      const docRef = doc(this.firestore, 'loans', this.loanId!);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.data = { id: docSnap.id, ...docSnap.data() };
        if (this.data.pagosRegistrados === undefined) {
          this.data.pagosRegistrados = 0;
        }
        await this.cargarHistorialPagos();
      } else {
        this.router.navigate(['/clientes']);
      }
    } catch (error) {
      console.error('Error al obtener el préstamo:', error);
    }
  }

  async cargarHistorialPagos() {
    try {
      const pagosRef = collection(this.firestore, 'pagos');
      const q = query(pagosRef, where('loanId', '==', this.loanId));
      const querySnapshot = await getDocs(q);
      
      this.historialPagos = querySnapshot.docs.map(doc => doc.data());
      // Ordenar por número de cuota
      this.historialPagos.sort((a, b) => a.cuotaNumero - b.cuotaNumero);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  }

  async confirmarRegistroPago() {
    if (this.isSubmitting) return; // Bloquea si ya se está procesando

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
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, Registrar',
          handler: async () => {
            await this.ejecutarRegistroPago();
          }
        }
      ]
    });

    await alert.present();
  }

  async ejecutarRegistroPago() {
    this.isSubmitting = true;
    this.data.pagosRegistrados++;
    const fechaPago = new Date().toISOString();

    try {
      const loanDocRef = doc(this.firestore, 'loans', this.loanId!);
      await updateDoc(loanDocRef, {
        pagosRegistrados: this.data.pagosRegistrados
      });

      const pagosRef = collection(this.firestore, 'pagos');
      await addDoc(pagosRef, {
        loanId: this.loanId,
        clientName: this.data.clientName,
        clientCedula: this.data.clientCedula,
        cuotaNumero: this.data.pagosRegistrados,
        totalCuotas: this.data.totalInstallments,
        montoPagado: this.data.installmentAmount,
        fecha: fechaPago
      });

      await this.cargarHistorialPagos();

      const alert = await this.alertController.create({
        header: '¡Pago Registrado!',
        message: `La cuota ${this.data.pagosRegistrados} de ${this.data.totalInstallments} se ha guardado con éxito.`,
        buttons: ['OK']
      });
      await alert.present();

    } catch (error) {
      console.error('Error al registrar el pago:', error);
      this.data.pagosRegistrados--; // Revertir en caso de error
    } finally {
      this.isSubmitting = false;
    }
  }

async compartirPdfWhatsApp() {
    // 1. Validar que el elemento exista en el DOM
    const element = document.getElementById('receipt-content');
    if (!element) {
      console.error('No se encontró el elemento #receipt-content en el DOM.');
      return;
    }

    // 2. Dar un pequeño respiro al DOM para asegurar que esté completamente renderizado
    await new Promise(resolve => setTimeout(resolve, 350));

    // 3. Validar dimensiones reales antes de llamar a html2pdf
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      console.error('El elemento tiene un ancho o alto de 0px.');
      return;
    }

    const opt = {
      margin: 10,
      filename: `Recibo_Pago_${this.data.clientName}_Cuota_${this.data.pagosRegistrados}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false 
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await (html2pdf() as any).from(element).set(opt).output('blob');
      const file = new File([pdfBlob], `Recibo_Cuota_${this.data.pagosRegistrados}.pdf`, { type: 'application/pdf' });

      const mensajeTexto = `Hola *${this.data.clientName}*, aquí tienes tu recibo de pago de la cuota ${this.data.pagosRegistrados} de ${this.data.totalInstallments} por RD$ ${this.data.installmentAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}. - *Préstamos Mena*`;

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Recibo de Pago', text: mensajeTexto });
      } else {
        (html2pdf() as any).from(element).set(opt).save();
        const telefonoLimpio = this.data.clientPhone ? this.data.clientPhone.replace(/\D/g, '') : '';
        const urlWhatsApp = `https://api.whatsapp.com/send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensajeTexto)}`;
        window.open(urlWhatsApp, '_blank');
      }
    } catch (error) {
      console.error('Error al compartir PDF:', error);
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