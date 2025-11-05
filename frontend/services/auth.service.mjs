import { Injectable, signal } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';

const STORAGE_KEY = 'os-web-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal(this.loadStoredUser());

  loadStoredUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Erro ao ler sessão salva', err);
    }
    return null;
  }

  setSession(user) {
    this.currentUser.set(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  logout() {
    this.setSession(null);
  }

  isLogged() {
    return !!this.currentUser();
  }

  hasRole(role) {
    const user = this.currentUser();
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }
}
