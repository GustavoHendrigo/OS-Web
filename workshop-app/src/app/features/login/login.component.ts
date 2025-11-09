import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  readonly presetUsers = [
    { username: 'admin', password: 'admin123', description: 'Administrador' },
    { username: 'mecanico', password: 'mecanico123', description: 'Mecânico' }
  ];

  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.authService.login(this.form.value).subscribe({
      error: () => this.errorMessage.set('Não foi possível entrar. Verifique as credenciais.' )
    });
  }

  fillPreset(username: string, password: string): void {
    this.form.patchValue({ username, password });
    this.errorMessage.set(null);
  }
}
