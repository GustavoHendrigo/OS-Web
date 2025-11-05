import { Component, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { FormBuilder, ReactiveFormsModule, Validators } from 'https://cdn.jsdelivr.net/npm/@angular/forms@17.2.0/fesm2022/forms.mjs';
import { Router } from 'https://cdn.jsdelivr.net/npm/@angular/router@17.2.0/fesm2022/router.mjs';
import { NgIf } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/common.mjs';
import { ApiService } from '../services/api.service.mjs';
import { AuthService } from '../services/auth.service.mjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <section class="card" style="max-width:420px;margin:3rem auto;">
      <h2>Acesso ao sistema</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div>
          <label>Usuário</label>
          <input type="text" formControlName="username" placeholder="admin ou mecanico" />
        </div>
        <div style="margin-top:1rem;">
          <label>Senha</label>
          <input type="password" formControlName="password" placeholder="Senha" />
        </div>
        <div style="margin-top:1rem;">
          <button class="btn" type="submit" [disabled]="form.invalid || loading">Entrar</button>
        </div>
        <p *ngIf="error" style="color:var(--color-danger);">{{ error }}</p>
        <p class="no-print" style="margin-top:1rem; font-size:0.85rem; color:#555;">
          Dicas de acesso: <strong>admin / admin123</strong> ou <strong>mecanico / mecanico123</strong>
        </p>
      </form>
    </section>
  `,
})
export class LoginComponent {
  fb = inject(FormBuilder);
  api = inject(ApiService);
  auth = inject(AuthService);
  router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.api.login(this.form.getRawValue()).subscribe({
      next: ({ user }) => {
        this.auth.setSession(user);
        this.loading = false;
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Falha no login';
      },
    });
  }
}
