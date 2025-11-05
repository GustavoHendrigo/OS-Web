import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ShellComponent } from './components/shell/shell.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ServiceOrdersComponent } from './components/service-orders/service-orders.component';
import { ServiceOrderDetailComponent } from './components/service-order-detail/service-order-detail.component';
import { ClientsComponent } from './components/clients/clients.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'ordens-de-servico', component: ServiceOrdersComponent },
      { path: 'ordens-de-servico/:id', component: ServiceOrderDetailComponent },
      { path: 'clientes', component: ClientsComponent },
      { path: 'estoque', component: InventoryComponent }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
