import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { ServiceOrdersPageComponent } from './pages/service-orders/service-orders-page.component';
import { ClientsPageComponent } from './pages/clients/clients-page.component';
import { InventoryPageComponent } from './pages/inventory/inventory-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { ServiceOrderDetailPageComponent } from './pages/service-order-detail/service-order-detail-page.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardPageComponent },
      { path: 'ordens-servico', component: ServiceOrdersPageComponent },
      { path: 'ordens-servico/:id', component: ServiceOrderDetailPageComponent },
      { path: 'clientes', component: ClientsPageComponent },
      { path: 'estoque', component: InventoryPageComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
