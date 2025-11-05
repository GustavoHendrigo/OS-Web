import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardPageComponent } from './pages/dashboard/dashboard-page.component';
import { ServiceOrdersPageComponent } from './pages/service-orders/service-orders-page.component';
import { ClientsPageComponent } from './pages/clients/clients-page.component';
import { InventoryPageComponent } from './pages/inventory/inventory-page.component';
import { LoginPageComponent } from './pages/login/login-page.component';
import { ServiceOrderDetailPageComponent } from './pages/service-order-detail/service-order-detail-page.component';
import { AuthInterceptor } from './services/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    DashboardPageComponent,
    ServiceOrdersPageComponent,
    ClientsPageComponent,
    InventoryPageComponent,
    LoginPageComponent,
    ServiceOrderDetailPageComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
