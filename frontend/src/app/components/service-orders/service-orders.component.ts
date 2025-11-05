import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ServiceOrderService } from '../../services/service-order.service';
import { ClientService } from '../../services/client.service';
import { InventoryService } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';
import { ServiceOrder, ServiceOrderPayload } from '../../models/service-order.model';
import { Client } from '../../models/client.model';
import { InventoryItem } from '../../models/inventory-item.model';
import { formatCurrency } from '../../utils/formatters';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-service-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './service-orders.component.html',
  styleUrls: ['./service-orders.component.scss']
})
export class ServiceOrdersComponent implements OnInit {
  private serviceOrderService = inject(ServiceOrderService);
  private clientService = inject(ClientService);
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);

  loading = signal<boolean>(true);
  orders = signal<ServiceOrder[]>([]);
  clients = signal<Client[]>([]);
  inventory = signal<InventoryItem[]>([]);

  searchTerm = signal<string>('');
  statusFilter = signal<string>('todos');
  showCreateForm = signal<boolean>(false);

  readonly statusOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
    { value: 'finalizada', label: 'Finalizada' },
    { value: 'entregue', label: 'Entregue' }
  ];

  orderForm = this.fb.nonNullable.group({
    clientId: [0, Validators.required],
    vehicle: this.fb.nonNullable.group({
      make: ['', Validators.required],
      model: ['', Validators.required],
      year: [2024, [Validators.required, Validators.min(1900)]],
      plate: ['', Validators.required]
    }),
    reportedIssue: ['', Validators.required],
    notes: [''],
    status: ['aguardando_aprovacao', Validators.required],
    discount: [0],
    services: this.fb.nonNullable.array([]),
    parts: this.fb.nonNullable.array([])
  });

  filteredOrders = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    return this.orders().filter((order) => {
      const matchesTerm =
        !term ||
        order.code.toLowerCase().includes(term) ||
        order.client?.name.toLowerCase().includes(term) ||
        order.vehicle.plate.toLowerCase().includes(term) ||
        order.vehicle.model.toLowerCase().includes(term);
      const matchesStatus = status === 'todos' || order.status === status;
      return matchesTerm && matchesStatus;
    });
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
      .finally(() => {
        this.loading.set(false);
        if (this.services.controls.length === 0) {
          this.addService();
        }
      });
  }

  get services(): FormArray {
    return this.orderForm.controls.services;
  }

  get parts(): FormArray {
    return this.orderForm.controls.parts;
  }

  addService(): void {
    this.services.push(
      this.fb.nonNullable.group({
        description: ['', Validators.required],
        hours: [1, [Validators.required, Validators.min(0.25)]],
        rate: [150, [Validators.required, Validators.min(0)]],
        total: [{ value: 150, disabled: true }]
      })
    );
  }

  removeService(index: number): void {
    this.services.removeAt(index);
  }

  addPart(): void {
    this.parts.push(
      this.fb.nonNullable.group({
        inventoryItemId: [null],
        description: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        total: [{ value: 0, disabled: true }]
      })
    );
  }

  removePart(index: number): void {
    this.parts.removeAt(index);
  }

  onInventorySelection(index: number): void {
    const control = this.parts.at(index);
    const inventoryItemId = control.get('inventoryItemId')?.value as number | null;
    if (!inventoryItemId) {
      return;
    }
    const item = this.inventory().find((inv) => inv.id === inventoryItemId);
    if (item) {
      control.patchValue({
        description: item.name,
        unitPrice: item.unitPrice ?? 0,
        total: item.unitPrice ?? 0
      });
    }
  }

  toggleCreate(): void {
    if (!this.authService.hasRole('admin')) {
      return;
    }
    this.showCreateForm.set(!this.showCreateForm());
  }

  submitOrder(): void {
    if (!this.authService.hasRole('admin')) {
      return;
    }
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const payload: ServiceOrderPayload = this.buildPayload();
    this.serviceOrderService.create(payload).subscribe({
      next: (order) => {
        this.orders.update((current) => [order, ...current]);
        this.orderForm.reset({
          clientId: 0,
          vehicle: { make: '', model: '', year: 2024, plate: '' },
          reportedIssue: '',
          notes: '',
          status: 'aguardando_aprovacao',
          discount: 0
        });
        this.services.clear();
        this.parts.clear();
        this.addService();
        this.showCreateForm.set(false);
      }
    });
  }

  updateStatus(order: ServiceOrder, status: string): void {
    if (!this.authService.hasRole('admin')) {
      return;
    }
    if (order.status === status) {
      return;
    }
    this.serviceOrderService.updateStatus(order.id, status as ServiceOrder['status']).subscribe((updated) => {
      this.orders.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    });
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  private buildPayload(): ServiceOrderPayload {
    const raw = this.orderForm.getRawValue();

    return {
      clientId: raw.clientId,
      vehicle: raw.vehicle,
      reportedIssue: raw.reportedIssue,
      notes: raw.notes,
      status: raw.status as ServiceOrder['status'],
      discount: raw.discount ?? 0,
      services: raw.services.map((service) => ({
        description: service.description,
        hours: service.hours,
        rate: service.rate
      })),
      parts: raw.parts.map((part) => ({
        inventoryItemId: part.inventoryItemId ?? undefined,
        description: part.description,
        quantity: part.quantity,
        unitPrice: part.unitPrice
      }))
    };
  }
}
