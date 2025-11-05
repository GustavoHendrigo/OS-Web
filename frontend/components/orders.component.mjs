import { Component, OnInit, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from 'https://cdn.jsdelivr.net/npm/@angular/forms@17.2.0/fesm2022/forms.mjs';
import { NgFor, NgIf, SlicePipe } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/common.mjs';
import { RouterLink } from 'https://cdn.jsdelivr.net/npm/@angular/router@17.2.0/fesm2022/router.mjs';
import { ApiService } from '../services/api.service.mjs';
import { AuthService } from '../services/auth.service.mjs';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
];

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [NgFor, NgIf, SlicePipe, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <h2>Ordens de serviço</h2>
      <div class="toolbar">
        <input placeholder="Pesquisar descrição, cliente ou veículo" [(ngModel)]="searchTerm" (input)="onFiltersChange()" />
        <select [(ngModel)]="statusFilter" (change)="onFiltersChange()">
          <option *ngFor="let option of statusOptions" [value]="option.value">{{ option.label }}</option>
        </select>
        <button class="btn" (click)="toggleForm()" *ngIf="canManage">{{ showForm ? 'Fechar' : 'Nova ordem' }}</button>
      </div>
      <form class="card" *ngIf="showForm" [formGroup]="form" (ngSubmit)="submit()">
        <h3>Cadastrar ordem</h3>
        <div class="grid">
          <div>
            <label>Cliente</label>
            <select formControlName="client_id">
              <option value="">Selecione um cliente</option>
              <option *ngFor="let client of clients" [value]="client.id">{{ client.name }}</option>
            </select>
          </div>
          <div>
            <label>Veículo</label>
            <input formControlName="vehicle" placeholder="Modelo do veículo" />
          </div>
          <div>
            <label>Status</label>
            <select formControlName="status">
              <option *ngFor="let option of statusOptions | slice:1" [value]="option.value">{{ option.label }}</option>
            </select>
          </div>
        </div>
        <div class="grid">
          <div>
            <label>Custo de mão de obra</label>
            <input type="number" step="0.01" formControlName="labor_cost" />
          </div>
          <div>
            <label>Custo de peças</label>
            <input type="number" step="0.01" formControlName="parts_cost" />
          </div>
          <div>
            <label>Custos adicionais</label>
            <input type="number" step="0.01" formControlName="additional_cost" />
          </div>
        </div>
        <div>
          <label>Serviços executados</label>
          <textarea formControlName="services" rows="2"></textarea>
        </div>
        <div>
          <label>Peças utilizadas</label>
          <textarea formControlName="parts" rows="2"></textarea>
        </div>
        <div>
          <label>Observações</label>
          <textarea formControlName="notes" rows="3"></textarea>
        </div>
        <div>
          <label>Descrição</label>
          <textarea formControlName="description" rows="3" required></textarea>
        </div>
        <div style="margin-top:1rem;">
          <button class="btn" type="submit" [disabled]="form.invalid">Salvar</button>
        </div>
      </form>
      <table class="table" *ngIf="orders.length; else empty">
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Veículo</th>
            <th>Descrição</th>
            <th>Status</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let order of orders">
            <td>{{ order.id }}</td>
            <td>{{ order.client_name }}</td>
            <td>{{ order.vehicle }}</td>
            <td>{{ order.description }}</td>
            <td><span class="status-chip status-{{ order.status }}">{{ order.status_label }}</span></td>
            <td>R$ {{ order.total | number:'1.2-2' }}</td>
            <td>
              <a [routerLink]="['/orders', order.id]" class="btn">Detalhes</a>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>Nenhuma ordem encontrada com os filtros selecionados.</p>
      </ng-template>
    </section>
  `,
})
export class OrdersComponent implements OnInit {
  api = inject(ApiService);
  fb = inject(FormBuilder);
  auth = inject(AuthService);

  orders = [];
  clients = [];
  showForm = false;
  searchTerm = '';
  statusFilter = '';
  statusOptions = STATUS_OPTIONS;

  form = this.fb.nonNullable.group({
    client_id: ['', Validators.required],
    vehicle: [''],
    description: ['', Validators.required],
    status: ['em_andamento', Validators.required],
    labor_cost: [0],
    parts_cost: [0],
    additional_cost: [0],
    services: [''],
    parts: [''],
    notes: [''],
  });

  get canManage() {
    return this.auth.hasRole(['admin']);
  }

  ngOnInit() {
    this.load();
    this.loadClients();
  }

  load(params = {}) {
    const filters = {
      search: this.searchTerm,
      status: this.statusFilter,
      ...params,
    };
    Object.keys(filters).forEach((key) => {
      if (!filters[key]) delete filters[key];
    });
    this.api.getOrders(filters).subscribe((data) => {
      this.orders = data;
    });
  }

  loadClients() {
    this.api.getClients().subscribe((clients) => (this.clients = clients));
  }

  onFiltersChange() {
    this.load();
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.form.reset({
        client_id: '',
        vehicle: '',
        description: '',
        status: 'em_andamento',
        labor_cost: 0,
        parts_cost: 0,
        additional_cost: 0,
        services: '',
        parts: '',
        notes: '',
      });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.api.createOrder({
      ...this.form.getRawValue(),
      labor_cost: parseFloat(this.form.value.labor_cost) || 0,
      parts_cost: parseFloat(this.form.value.parts_cost) || 0,
      additional_cost: parseFloat(this.form.value.additional_cost) || 0,
    }).subscribe(() => {
      this.toggleForm();
      this.load();
    });
  }
}
