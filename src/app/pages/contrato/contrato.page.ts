import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
// Importa herramientas de Firestore para buscar por ID
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-contrato',
  templateUrl: './contrato.page.html',
  styleUrls: ['./contrato.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton]
})
export class ContratoPage implements OnInit {
  data: any = null;
  currentDate: string = '';
  
  private firestore = inject(Firestore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    this.currentDate = new Date().toLocaleDateString('es-DO', options);

    // NOS SUSCRIBIMOS A LOS CAMBIOS DE RUTA: 
    // Esto detecta automáticamente cuando navegas a otro contrato sin destruir la vista.
    this.route.paramMap.subscribe(params => {
      const loanId = params.get('id');
      if (loanId) {
        this.cargarContratoPorId(loanId);
      } else {
        // Respaldo por si viene por navigation state (por ejemplo, justo al crearlo)
        const navigation = this.router.getCurrentNavigation();
        if (navigation?.extras?.state) {
          this.data = navigation.extras.state;
        } else if (!this.data) {
          this.router.navigate(['/principal']);
        }
      }
    });
  }

  // Método auxiliar para consultar Firestore de forma limpia
  async cargarContratoPorId(loanId: string) {
    try {
      const docRef = doc(this.firestore, `loans/${loanId}`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.data = { id: docSnap.id, ...docSnap.data() };
      } else {
        console.error("El préstamo no existe en la base de datos.");
        this.router.navigate(['/principal']);
      }
    } catch (error) {
      console.error("Error al cargar el préstamo de Firestore:", error);
    }
  }

  async shareOnWhatsApp() {
    if (!this.data) return;
    const element = document.getElementById('contract-content');
    const opt = {
      margin: 10,
      filename: `Contrato_${this.data.clientName || 'Cliente'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const pdfBlob = await (html2pdf() as any).from(element).set(opt).output('blob');
    const file = new File([pdfBlob], `Contrato_${this.data.clientName || 'Cliente'}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Contrato de Préstamo',
        text: 'Aquí tienes tu contrato.'
      });
    } else {
      (html2pdf() as any).from(element).set(opt).save();
    }
  }

  printContract() {
    window.print();
  }

  goBack() {
    this.router.navigate(['/principal']);
  }
}