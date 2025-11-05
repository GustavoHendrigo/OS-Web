import { bootstrapApplication } from 'https://cdn.jsdelivr.net/npm/@angular/platform-browser@17.2.0/fesm2022/platform-browser.mjs';
import { provideRouter, withComponentInputBinding } from 'https://cdn.jsdelivr.net/npm/@angular/router@17.2.0/fesm2022/router.mjs';
import { provideHttpClient, withFetch } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/http.mjs';
import { importProvidersFrom } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { FormsModule, ReactiveFormsModule } from 'https://cdn.jsdelivr.net/npm/@angular/forms@17.2.0/fesm2022/forms.mjs';
import { AppComponent } from './components/app.component.mjs';
import { LoginComponent } from './components/login.component.mjs';
import { DashboardComponent } from './components/dashboard.component.mjs';
import { OrdersComponent } from './components/orders.component.mjs';
import { OrderDetailComponent } from './components/order-detail.component.mjs';
import { ClientsComponent } from './components/clients.component.mjs';
import { InventoryComponent } from './components/inventory.component.mjs';
import { authGuard } from './services/auth.guard.mjs';

const routes = [
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'orders', component: OrdersComponent, canActivate: [authGuard] },
  { path: 'orders/:id', component: OrderDetailComponent, canActivate: [authGuard] },
  { path: 'clients', component: ClientsComponent, canActivate: [authGuard] },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    importProvidersFrom(FormsModule, ReactiveFormsModule),
  ],
}).catch((err) => console.error(err));
