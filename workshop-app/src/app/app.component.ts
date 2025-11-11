import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf, UpperCasePipe } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, UpperCasePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private authService = inject(AuthService);

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get userRole(): string | null {
    return this.authService.currentUser()?.role ?? null;
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  logout(): void {
    this.authService.logout();
  }
}
