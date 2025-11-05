import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthenticatedUser, LoginRequest } from '../models/auth.models';
import { Router } from '@angular/router';

const STORAGE_KEY = 'workshop-auth-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthenticatedUser | null>(this.restoreUser());
  currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient, private router: Router) {}

  login(payload: LoginRequest): Observable<AuthenticatedUser> {
    return this.http.post<AuthenticatedUser>(`${this.apiUrl}/login`, payload).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    return !!user && roles.includes(user.role);
  }

  requireRoles(roles: string[]): void {
    if (!this.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.hasRole(roles)) {
      this.router.navigate(['/']);
    }
  }

  getToken(): string | null {
    return this.currentUserSubject.value?.token ?? null;
  }

  private restoreUser(): AuthenticatedUser | null {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return null;
    }

    try {
      const parsed: AuthenticatedUser = JSON.parse(saved);
      return parsed;
    } catch (error) {
      console.warn('Unable to parse stored user data', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
