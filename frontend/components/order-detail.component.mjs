import { Component, OnInit, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { ActivatedRoute, Router } from 'https://cdn.jsdelivr.net/npm/@angular/router@17.2.0/fesm2022/router.mjs';
import { DatePipe, NgIf } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/common.mjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from 'https://cdn.jsdelivr.net/npm/@angular/forms@17.2.0/fesm2022/forms.mjs';
import { ApiService } from '../services/api.service.mjs';
import { AuthService } from '../services/auth.service.mjs';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [NgIf, DatePipe, FormsModule, ReactiveFormsModule],
  template: `
    <section class="card" *ngIf="order; else loading">
      <div class="print-view">
        <h2>Ordem de Serviço #{{ order.id }}</h2>
        <p><strong>Cliente:</strong> {{ order.client_name }} | <strong>Telefone:</strong> {{ order.client_phone }}</p>
        <p><strong>Veículo:</strong> {{ order.vehicle || '-' }}</p>
        <p><strong>Status:</strong> <span class="status-chip status-{{ order.status }}">{{ order.status_label }}</span></p>
        <p><strong>Criada em:</strong> {{ order.created_at | date:'short' }}</p>
        <div class="summary">
          <div class="summary-item">
            <h3>Mão de obra</h3>
            <p>R$ {{ order.labor_cost | number:'1.2-2' }}</p>
          </div>
          <div class="summary-item">
            <h3>Peças</h3>
            <p>R$ {{ order.parts_cost | number:'1.2-2' }}</p>
          </div>
          <div class="summary-item">
            <h3>Adicionais</h3>
            <p>R$ {{ order.additional_cost | number:'1.2-2' }}</p>
          </div>
          <div class="summary-item">
            <h3>Total</h3>
            <p style="font-size:1.4rem;font-weight:700;">R$ {{ order.total | number:'1.2-2' }}</p>
          </div>
        </div>
        <div>
          <h3>Serviços executados</h3>
          <p>{{ order.services || '-' }}</p>
        </div>
        <div>
          <h3>Peças utilizadas</h3>
          <p>{{ order.parts || '-' }}</p>
        </div>
        <div>
          <h3>Observações</h3>
          <p>{{ order.notes || '-' }}</p>
        </div>
        <div class="print-actions">
          <button class="btn secondary" type="button" (click)="print()">Imprimir</button>
          <button class="btn" type="button" (click)="goBack()">Voltar</button>
        </div>
      </div>
    </section>

    <section class="card" *ngIf="canManage && order">
      <h3>Atualizar ordem</h3>
      <form [formGroup]="form" (ngSubmit)="update()">
        <div class="grid">
          <div>
            <label>Status</label>
            <select formControlName="status">
              <option value="em_andamento">Em andamento</option>
              <option value="aguardando_aprovacao">Aguardando aprovação</option>
              <option value="aprovado">Aprovado</option>
              <option value="concluido">Concluído</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div>
            <label>Mão de obra</label>
            <input type="number" step="0.01" formControlName="labor_cost" />
          </div>
          <div>
            <label>Peças</label>
            <input type="number" step="0.01" formControlName="parts_cost" />
          </div>
          <div>
            <label>Adicionais</label>
            <input type="number" step="0.01" formControlName="additional_cost" />
          </div>
        </div>
        <div>
          <label>Serviços</label>
          <textarea rows="3" formControlName="services"></textarea>
        </div>
        <div>
          <label>Peças</label>
          <textarea rows="3" formControlName="parts"></textarea>
        </div>
        <div>
          <label>Observações</label>
          <textarea rows="3" formControlName="notes"></textarea>
        </div>
        <div style="margin-top:1rem;">
          <button class="btn" type="submit">Salvar alterações</button>
        </div>
      </form>
    </section>
    <ng-template #loading>
      <p>Carregando dados da ordem...</p>
    </ng-template>
  `,
})
export class OrderDetailComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  api = inject(ApiService);
  fb = inject(FormBuilder);
  auth = inject(AuthService);

  order = null;

  form = this.fb.nonNullable.group({
    status: ['em_andamento', Validators.required],
    labor_cost: [0],
    parts_cost: [0],
    additional_cost: [0],
    services: [''],
    parts: [''],
    notes: [''],
  });

  get canManage() {
    return this.auth.hasRole('admin');
  }

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadOrder(id);
      }
    });
  }

  loadOrder(id) {
    this.api.getOrder(id).subscribe((order) => {
      this.order = order;
      this.form.patchValue({
        status: order.status,
        labor_cost: order.labor_cost,
        parts_cost: order.parts_cost,
        additional_cost: order.additional_cost,
        services: order.services,
        parts: order.parts,
        notes: order.notes,
      });
    });
  }

  update() {
    if (!this.order) return;
    this.api.updateOrder(this.order.id, {
      ...this.form.getRawValue(),
      labor_cost: parseFloat(this.form.value.labor_cost) || 0,
      parts_cost: parseFloat(this.form.value.parts_cost) || 0,
      additional_cost: parseFloat(this.form.value.additional_cost) || 0,
    }).subscribe((order) => {
      this.order = order;
    });
  }

  print() {
    window.print();
  }

  goBack() {
    this.router.navigate(['/orders']);
  }
}
