import { Routes } from '@angular/router';

export const routes: Routes = [
 
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'principal',
    loadComponent: () => import('./pages/principal/principal.page').then( m => m.PrincipalPage)
  },
  {
    path: 'contrato',
    loadComponent: () => import('./pages/contrato/contrato.page').then( m => m.ContratoPage)
  },
  {
    path: 'contrato/:id',
    loadComponent: () => import('./pages/contrato/contrato.page').then( m => m.ContratoPage)
  },
  {
    path: 'clientes',
    loadComponent: () => import('./clientes/clientes.page').then( m => m.ClientesPage)
  },
  {
    path: 'pago',
    loadComponent: () => import('./pago/pago.page').then( m => m.PagoPage)
  },
  
];
