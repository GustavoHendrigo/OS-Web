import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceOrderService } from '../../services/service-order.service';
import { ClientService } from '../../services/client.service';
import { InventoryService } from '../../services/inventory.service';
import { RouterLink } from '@angular/router';
import { formatCurrency } from '../../utils/formatters';
import { ServiceOrder } from '../../models/service-order.model';
import { Client } from '../../models/client.model';
import { InventoryItem } from '../../models/inventory-item.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private serviceOrderService = inject(ServiceOrderService);
  private clientService = inject(ClientService);
  private inventoryService = inject(InventoryService);

  loading = signal<boolean>(true);
  orders = signal<ServiceOrder[]>([]);
  clients = signal<Client[]>([]);
  inventory = signal<InventoryItem[]>([]);

  totalRevenue = computed(() =>
    this.orders().reduce((total, order) => total + order.summary.total, 0)
  );

  ordersByStatus = computed(() => {
    const counts: Record<string, number> = {};
    for (const order of this.orders()) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  });

  ngOnInit(): void {
    Promise.all([
      firstValueFrom(this.serviceOrderService.list()),
      firstValueFrom(this.clientService.list()),
      firstValueFrom(this.inventoryService.list())
    ])
      .then(([orders, clients, inventory]) => {
        this.orders.set(orders ?? []);
        this.clients.set(clients ?? []);
        this.inventory.set(inventory ?? []);
      })
      .finally(() => this.loading.set(false));
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }
}
