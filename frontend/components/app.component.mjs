import { Component, computed, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { Router, RouterLink, RouterOutlet } from 'https://cdn.jsdelivr.net/npm/@angular/router@17.2.0/fesm2022/router.mjs';
import { NgIf, NgFor } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/common.mjs';
import { AuthService } from '../services/auth.service.mjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NgIf, NgFor],
  template: `
    <header class="topbar">
      <div>
        <strong>Oficina Mecânica</strong>
      </div>
      <nav class="menu" *ngIf="logged()">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
        <a routerLink="/orders" routerLinkActive="active">Ordens de serviço</a>
        <a routerLink="/clients" routerLinkActive="active">Clientes</a>
        <a routerLink="/inventory" routerLinkActive="active">Estoque</a>
      </nav>
      <div *ngIf="logged(); else loginLink">
        <span>{{ user()?.full_name }} ({{ user()?.role }})</span>
        <button class="btn" (click)="logout()">Sair</button>
      </div>
      <ng-template #loginLink>
        <a routerLink="/login" class="btn">Entrar</a>
      </ng-template>
    </header>
    <main class="content">
      <router-outlet></router-outlet>
    </main>
  `,
})
export class AppComponent {
  auth = inject(AuthService);
  router = inject(Router);
  user = computed(() => this.auth.currentUser());
  logged = computed(() => this.auth.isLogged());

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
