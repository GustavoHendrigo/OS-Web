import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import {
  CreateServiceOrderRequest,
  LaborItem,
  PartItem,
  ServiceOrderStatus,
  ServiceOrderSummary
} from '../../models/service-order.models';
import { Client } from '../../models/client.model';
import { AuthService } from '../../services/auth.service';

interface StatusOption {
  value: ServiceOrderStatus | 'todos';
  label: string;
}

@Component({
  selector: 'app-service-orders-page',
  templateUrl: './service-orders-page.component.html',
  styleUrls: ['./service-orders-page.component.scss']
})
export class ServiceOrdersPageComponent implements OnInit {
  orders: ServiceOrderSummary[] = [];
  loading = false;
  creating = false;
  createError?: string;
  listError?: string;

  statusFilter: StatusOption['value'] = 'todos';
  searchTerm = '';

  showCreateForm = false;

  clients: Client[] = [];
  laborItems: LaborItem[] = [{ description: '', hours: 1, rate: 120 }];
  partItems: PartItem[] = [{ description: '', quantity: 1, unitPrice: 0 }];

  newOrder: CreateServiceOrderRequest = {
    clientId: 0,
    vehicle: '',
    description: '',
    status: 'aguardando_aprovacao',
    mechanicNotes: '',
    scheduledDate: undefined,
    labor: this.laborItems,
    parts: this.partItems
  };

  statusOptions: StatusOption[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
    { value: 'aprovada', label: 'Aprovada' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'aguardando_pecas', label: 'Aguardando peças' },
    { value: 'pronta', label: 'Pronta' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelada', label: 'Cancelada' }
  ];

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadClients();
  }

  loadOrders(): void {
    this.loading = true;
    this.listError = undefined;

    const filters: { status?: string; search?: string } = {};
    if (this.statusFilter !== 'todos') {
      filters.status = this.statusFilter;
    }
    if (this.searchTerm) {
      filters.search = this.searchTerm;
    }

    this.apiService.getServiceOrders(filters).subscribe({
      next: orders => {
        this.orders = orders;
        this.loading = false;
      },
      error: () => {
        this.listError = 'Não foi possível carregar as ordens no momento.';
        this.loading = false;
      }
    });
  }

  loadClients(): void {
    this.apiService.getClients().subscribe({
      next: clients => {
        this.clients = clients;
        if (clients.length && !this.newOrder.clientId) {
          this.newOrder.clientId = clients[0].id;
        }
      }
    });
  }

  toggleCreate(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      return;
    }
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.laborItems = [{ description: '', hours: 1, rate: 120 }];
    this.partItems = [{ description: '', quantity: 1, unitPrice: 0 }];
    this.newOrder = {
      clientId: this.clients[0]?.id ?? 0,
      vehicle: '',
      description: '',
      status: 'aguardando_aprovacao',
      mechanicNotes: '',
      scheduledDate: undefined,
      labor: this.laborItems,
      parts: this.partItems
    };
  }

  addLaborItem(): void {
    this.laborItems.push({ description: '', hours: 1, rate: 120 });
  }

  removeLaborItem(index: number): void {
    this.laborItems.splice(index, 1);
    if (!this.laborItems.length) {
      this.addLaborItem();
    }
  }

  addPartItem(): void {
    this.partItems.push({ description: '', quantity: 1, unitPrice: 0 });
  }

  removePartItem(index: number): void {
    this.partItems.splice(index, 1);
    if (!this.partItems.length) {
      this.addPartItem();
    }
  }

  submitOrder(): void {
    if (!this.newOrder.clientId) {
      this.createError = 'Selecione um cliente.';
      return;
    }

    if (!this.newOrder.vehicle || !this.newOrder.description) {
      this.createError = 'Preencha veículo e descrição do serviço.';
      return;
    }

    this.creating = true;
    this.createError = undefined;

    this.apiService.createServiceOrder({
      ...this.newOrder,
      labor: this.laborItems.filter(item => item.description?.trim()),
      parts: this.partItems.filter(item => item.description?.trim())
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.resetCreateForm();
        this.loadOrders();
      },
      error: () => {
        this.creating = false;
        this.createError = 'Não foi possível registrar a OS. Tente novamente.';
      }
    });
  }

  updateStatus(order: ServiceOrderSummary, status: ServiceOrderStatus): void {
    this.apiService.updateServiceOrder({ id: order.id, status }).subscribe({
      next: () => this.loadOrders(),
      error: () => (this.listError = 'Falha ao atualizar status da OS.')
    });
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  statusClass(status: ServiceOrderStatus): string {
    switch (status) {
      case 'aguardando_aprovacao':
        return 'warning';
      case 'aprovada':
      case 'em_andamento':
        return 'info';
      case 'pronta':
      case 'entregue':
        return 'success';
      case 'cancelada':
        return 'danger';
      default:
        return 'info';
    }
  }

  isAdmin(): boolean {
    return this.authService.hasRole(['admin']);
  }
}
