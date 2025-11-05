import { Component, OnInit, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from 'https://cdn.jsdelivr.net/npm/@angular/forms@17.2.0/fesm2022/forms.mjs';
import { NgFor, NgIf } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/common.mjs';
import { ApiService } from '../services/api.service.mjs';
import { AuthService } from '../services/auth.service.mjs';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <h2>Clientes</h2>
      <div class="toolbar">
        <input placeholder="Pesquisar por nome, telefone ou e-mail" [(ngModel)]="searchTerm" (input)="onSearch()" />
        <button class="btn" *ngIf="canManage" (click)="toggleForm()">{{ showForm ? 'Cancelar' : 'Novo cliente' }}</button>
      </div>
      <form class="card" *ngIf="showForm" [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid">
          <div>
            <label>Nome</label>
            <input formControlName="name" required />
          </div>
          <div>
            <label>Telefone</label>
            <input formControlName="phone" />
          </div>
        </div>
        <div class="grid">
          <div>
            <label>Email</label>
            <input formControlName="email" type="email" />
          </div>
          <div>
            <label>Endereço</label>
            <input formControlName="address" />
          </div>
        </div>
        <div style="margin-top:1rem;">
          <button class="btn" type="submit" [disabled]="form.invalid">Salvar</button>
        </div>
      </form>
      <table class="table" *ngIf="clients.length; else empty">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Email</th>
            <th>Endereço</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let client of clients">
            <td>{{ client.name }}</td>
            <td>{{ client.phone }}</td>
            <td>{{ client.email }}</td>
            <td>{{ client.address }}</td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>Nenhum cliente encontrado.</p>
      </ng-template>
    </section>
  `,
})
export class ClientsComponent implements OnInit {
  api = inject(ApiService);
  fb = inject(FormBuilder);
  auth = inject(AuthService);

  clients = [];
  searchTerm = '';
  showForm = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: [''],
    email: ['', Validators.email],
    address: [''],
  });

  get canManage() {
    return this.auth.hasRole('admin');
  }

  ngOnInit() {
    this.load();
  }

  load(params = {}) {
    const query = { search: this.searchTerm, ...params };
    Object.keys(query).forEach((key) => {
      if (!query[key]) delete query[key];
    });
    this.api.getClients(query).subscribe((clients) => (this.clients = clients));
  }

  onSearch() {
    this.load();
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.form.reset({ name: '', phone: '', email: '', address: '' });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.api.createClient(this.form.getRawValue()).subscribe(() => {
      this.toggleForm();
      this.load();
    });
  }
}
