import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonButton, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, AlertController } from '@ionic/angular/standalone';
import { Firestore, doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';

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
  isSubmitting: boolean = false;

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
      this.historialPagos.sort((a, b) => a.cuotaNumero - b.cuotaNumero);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  }

  async confirmarRegistroPago() {
    if (this.isSubmitting || !this.data) return;

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
    if (!this.data) return;
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
      this.data.pagosRegistrados--; 
    } finally {
      this.isSubmitting = false;
    }
  }

async compartirPdfWhatsApp() {
  try {
    await new Promise(resolve => setTimeout(resolve, 300)); // Damos un respiro mayor al DOM

    const element = document.getElementById('receipt-content');
    if (!element) {
      alert('No se encontró el recibo.');
      return;
    }

    // Generar el canvas con configuraciones seguras para evitar errores de renderizado de fondo
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false, // Evita que falle por logs internos de canvas
      onclone: (clonedDoc) => {
        // Opcional: Si hay algún elemento que cause problemas en la copia clonada, puedes ajustarlo aquí
        const clonedElement = clonedDoc.getElementById('receipt-content');
        if (clonedElement) {
          clonedElement.style.backgroundImage = 'none'; // Elimina fondos complejos si causan conflicto
        }
      }
    });

    if (canvas.width === 0 || canvas.height === 0) {
      alert('El recibo tiene dimensiones de 0.');
      return;
    }

    const base64Image = canvas.toDataURL('image/png');

    // Compartir mediante la API web o descarga de respaldo
    if (navigator.share) {
      const blob = await (await fetch(base64Image)).blob();
      const file = new File([blob], 'recibo-pago.png', { type: 'image/png' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Recibo de Préstamo',
          text: `Recibo de ${this.data.clientName}`,
          files: [file]
        });
        return;
      }
    }

    // Descarga directa si no hay soporte de compartir archivos
    const link = document.createElement('a');
    link.href = base64Image;
    link.download = `recibo-${this.data.clientCedula || 'pago'}.png`;
    link.click();

  } catch (error: any) {
    console.error('Error detallado al compartir:', error);
    alert('Ocurrió un error al intentar compartir: ' + (error?.message || error));
  }
}

  printReceipt() {
    window.print();
  }

  renovarPrestamo() {
    if (!this.data) return;
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