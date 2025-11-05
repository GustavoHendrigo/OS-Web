import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ServiceOrderDetails, ServiceOrderStatus } from '../../models/service-order.models';

@Component({
  selector: 'app-service-order-detail-page',
  templateUrl: './service-order-detail-page.component.html',
  styleUrls: ['./service-order-detail-page.component.scss']
})
export class ServiceOrderDetailPageComponent implements OnInit, OnDestroy {
  order?: ServiceOrderDetails;
  loading = false;
  error?: string;
  private sub?: Subscription;

  statusOptions = [
    { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
    { value: 'aprovada', label: 'Aprovada' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'aguardando_pecas', label: 'Aguardando peças' },
    { value: 'pronta', label: 'Pronta' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelada', label: 'Cancelada' }
  ];

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.sub = this.route.params.subscribe(params => {
      const id = Number(params['id']);
      if (Number.isFinite(id)) {
        this.loadOrder(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  loadOrder(id: number): void {
    this.loading = true;
    this.error = undefined;
    this.apiService.getServiceOrderById(id).subscribe({
      next: order => {
        this.order = order;
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar a OS.';
        this.loading = false;
      }
    });
  }

  updateStatus(status: ServiceOrderStatus): void {
    if (!this.order) {
      return;
    }

    this.apiService.updateServiceOrder({ id: this.order.id, status }).subscribe({
      next: order => (this.order = order),
      error: () => (this.error = 'Falha ao atualizar status da OS.')
    });
  }

  toggleApproval(): void {
    if (!this.order) {
      return;
    }

    this.apiService
      .updateServiceOrder({ id: this.order.id, approved: !this.order.approved })
      .subscribe({
        next: order => (this.order = order),
        error: () => (this.error = 'Falha ao atualizar aprovação.')
      });
  }

  laborTotal(): number {
    return this.order?.labor.reduce((total, item) => total + item.hours * item.rate, 0) ?? 0;
  }

  partsTotal(): number {
    return this.order?.parts.reduce((total, item) => total + item.quantity * item.unitPrice, 0) ?? 0;
  }

  print(): void {
    window.print();
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }
}
