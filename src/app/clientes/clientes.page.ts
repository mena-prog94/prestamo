import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonButton,
  IonSearchbar,
  IonButtons,
  IonMenuButton
} from '@ionic/angular/standalone';

import { Firestore, collection, getDocs, query, orderBy } from '@angular/fire/firestore';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonContent, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonButton,
    IonSearchbar,
    IonButtons,
    IonMenuButton
  ]
})
export class ClientesPage implements OnInit {
  clientes: any[] = [];
  clientesFiltrados: any[] = [];

  constructor(
    private firestore: Firestore,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.cargarClientes();
  }

  async cargarClientes() {
    try {
      const loansRef = collection(this.firestore, 'loans');
      const q = query(loansRef, orderBy('clientName', 'asc')); // Ordenados alfabéticamente por nombre
      const querySnapshot = await getDocs(q);

      this.clientes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Inicialmente mostramos todos
      this.clientesFiltrados = [...this.clientes];
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  }

  // Filtrar en tiempo real por el nombre del cliente o cédula
  filtrarClientes(event: any) {
    const texto = event.target.value ? event.target.value.toLowerCase().trim() : '';
    
    this.clientesFiltrados = this.clientes.filter(c => 
      (c.clientName && c.clientName.toLowerCase().includes(texto)) || 
      (c.clientCedula && c.clientCedula.includes(texto))
    );
  }

  // Al hacer clic en un cliente, te lleva directo a los detalles/contrato
  verDetalleContrato(cliente: any) {
    localStorage.setItem('currentLoanContract', JSON.stringify(cliente));
    this.router.navigate(['/pago'], { state: cliente });
  }


  goBack() {
    this.router.navigate(['/principal']);
  }
}