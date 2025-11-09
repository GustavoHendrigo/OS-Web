import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginPayload } from '../models/auth.model';
import { tap } from 'rxjs';

const STORAGE_KEY = 'planu-center:user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private userSignal = signal<AuthUser | null>(null);

  readonly user = computed(() => this.userSignal());

  constructor() {
    const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    if (canUseStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          this.userSignal.set(JSON.parse(stored) as AuthUser);
        } catch (err) {
          console.error('Unable to parse user session', err);
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }

      effect(() => {
        const current = this.userSignal();
        if (current) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      });
    }
  }

  login(payload: LoginPayload) {
    return this.http.post<AuthUser>(`${environment.apiUrl}/auth/login`, payload).pipe(
      tap((user) => {
        this.userSignal.set(user);
        this.router.navigate(['/']);
      })
    );
  }

  logout(): void {
    this.userSignal.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.userSignal();
  }

  currentUser(): AuthUser | null {
    return this.userSignal();
  }
}
