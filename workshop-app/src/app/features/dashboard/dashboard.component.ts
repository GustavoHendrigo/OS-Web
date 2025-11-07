import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../../core/services/orders.service';
import { ClientsService } from '../../core/services/clients.service';
import { InventoryService } from '../../core/services/inventory.service';
import { Order } from '../../core/models/order.model';
import { Client } from '../../core/models/client.model';
import { InventoryItem } from '../../core/models/inventory.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly clientsService = inject(ClientsService);
  private readonly inventoryService = inject(InventoryService);

  readonly orders = signal<Order[]>([]);
  readonly clients = signal<Client[]>([]);
  readonly inventory = signal<InventoryItem[]>([]);

  readonly statusLabels: Record<string, { label: string; class: string }> = {
    aberta: { label: 'Aberta', class: 'badge badge--open' },
    em_andamento: { label: 'Em andamento', class: 'badge badge--in-progress' },
    aguardando_aprovacao: { label: 'Aguardando aprovação', class: 'badge badge--waiting' },
    aguardando_pecas: { label: 'Aguardando peças', class: 'badge badge--waiting' },
    concluida: { label: 'Concluída', class: 'badge badge--completed' },
    entregue: { label: 'Entregue', class: 'badge badge--completed' }
  };

  ngOnInit(): void {
    this.ordersService.list().subscribe((orders) => this.orders.set(orders));
    this.clientsService.list().subscribe((clients) => this.clients.set(clients));
    this.inventoryService.list().subscribe((items) => this.inventory.set(items));
  }

  countByStatus(status: string): number {
    return this.orders().filter((order) => order.status === status).length;
  }

  get criticalItems(): InventoryItem[] {
    return this.inventory().filter((item) => item.quantity <= item.minQuantity);
  }
}
