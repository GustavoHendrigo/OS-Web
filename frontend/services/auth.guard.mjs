import { inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { Router } from 'https://cdn.jsdelivr.net/npm/@angular/router@17.2.0/fesm2022/router.mjs';
import { AuthService } from './auth.service.mjs';

export function authGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLogged()) {
    return true;
  }
  return router.createUrlTree(['/login']);
}

export function adminGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLogged() && auth.hasRole('admin')) {
    return true;
  }
  return router.createUrlTree(['/']);
}
