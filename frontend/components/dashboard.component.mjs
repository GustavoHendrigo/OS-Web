import { Component, OnInit, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { AsyncPipe, DatePipe, JsonPipe, KeyValuePipe, NgFor, NgIf } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/common.mjs';
import { RouterLink } from 'https://cdn.jsdelivr.net/npm/@angular/router@17.2.0/fesm2022/router.mjs';
import { ApiService } from '../services/api.service.mjs';

const STATUS_LABELS = {
  em_andamento: 'Em andamento',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, DatePipe, JsonPipe, RouterLink, KeyValuePipe],
  template: `
    <section class="card">
      <h2>Visão geral</h2>
      <p *ngIf="!dashboard">Carregando informações...</p>
      <div *ngIf="dashboard">
        <div class="summary">
          <div class="summary-item" *ngFor="let item of statusEntries">
            <h3>{{ item.label }}</h3>
            <p><strong>{{ item.count }}</strong> ordens</p>
          </div>
        </div>
        <div class="summary">
          <div class="summary-item">
            <h3>Total de ordens</h3>
            <p style="font-size:1.6rem;font-weight:700;">{{ dashboard.total_orders }}</p>
          </div>
          <div class="summary-item">
            <h3>Receita total</h3>
            <p>R$ {{ dashboard.financial.total | number:'1.2-2' }}</p>
            <small>Mão de obra: R$ {{ dashboard.financial.labor | number:'1.2-2' }}</small><br />
            <small>Peças: R$ {{ dashboard.financial.parts | number:'1.2-2' }}</small><br />
            <small>Adicionais: R$ {{ dashboard.financial.additional | number:'1.2-2' }}</small>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Ordens recentes</h2>
      <table class="table" *ngIf="dashboard?.recent_orders?.length; else noOrders">
        <thead>
          <tr>
            <th>#</th>
            <th>Cliente</th>
            <th>Descrição</th>
            <th>Status</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let order of dashboard.recent_orders">
            <td>{{ order.id }}</td>
            <td>{{ order.client_name }}</td>
            <td>{{ order.description }}</td>
            <td><span class="status-chip status-{{ order.status }}">{{ order.status_label }}</span></td>
            <td>{{ order.created_at | date:'short' }}</td>
            <td><a [routerLink]="['/orders', order.id]" class="btn">Detalhes</a></td>
          </tr>
        </tbody>
      </table>
      <ng-template #noOrders>
        <p>Nenhuma ordem cadastrada recentemente.</p>
      </ng-template>
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  api = inject(ApiService);
  dashboard = null;
  statusEntries = [];

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getDashboard().subscribe((data) => {
      this.dashboard = data;
      this.statusEntries = Object.entries(data.status_summary || {}).map(([key, value]) => ({
        key,
        label: STATUS_LABELS[key] || key,
        count: value,
      }));
    });
  }
}
