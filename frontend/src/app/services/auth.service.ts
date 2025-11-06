import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

interface LoginResponse extends User {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private currentUserSignal = signal<User | null>(this.readStoredUser());

  login(username: string, password: string): Observable<User> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/login`, { username, password })
      .pipe(
        tap((user) => {
          this.currentUserSignal.set(user);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('osweb_user', JSON.stringify(user));
          }
        })
      );
  }

  logout(): void {
    this.currentUserSignal.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('osweb_user');
    }
  }

  currentUser(): User | null {
    return this.currentUserSignal();
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSignal();
  }

  hasRole(role: User['role']): boolean {
    const user = this.currentUserSignal();
    if (!user) {
      return false;
    }
    if (role === 'admin') {
      return user.role === 'admin';
    }
    return user.role === role || user.role === 'admin';
  }

  private readStoredUser(): User | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem('osweb_user');
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
