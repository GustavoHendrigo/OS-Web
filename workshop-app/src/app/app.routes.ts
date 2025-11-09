import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';
import { LoginComponent } from './features/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { OrdersPageComponent } from './features/orders/pages/orders-page.component';
import { OrderDetailPageComponent } from './features/orders/pages/order-detail-page.component';
import { ClientsComponent } from './features/clients/clients.component';
import { InventoryComponent } from './features/inventory/inventory.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', component: DashboardComponent },
      { path: 'ordens', component: OrdersPageComponent },
      { path: 'ordens/:id', component: OrderDetailPageComponent },
      { path: 'clientes', component: ClientsComponent, canActivate: [AdminGuard] },
      { path: 'estoque', component: InventoryComponent, canActivate: [AdminGuard] }
    ]
  },
  { path: '**', redirectTo: '' }
];
