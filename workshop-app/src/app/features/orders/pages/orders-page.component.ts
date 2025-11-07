import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../../../core/services/orders.service';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { AuthService } from '../../../core/services/auth.service';
import { ClientsService } from '../../../core/services/clients.service';
import { Client } from '../../../core/models/client.model';

interface OrderFilters {
  search: string;
  status: OrderStatus | '';
}

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, NgFor, NgIf, CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './orders-page.component.html',
  styleUrls: ['./orders-page.component.scss']
})
export class OrdersPageComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly clientsService = inject(ClientsService);

  readonly filterForm: FormGroup = this.fb.group({
    search: [''],
    status: ['']
  });

  private readonly ordersSignal = signal<Order[]>([]);
  private readonly filtersSignal = signal<OrderFilters>({ search: '', status: '' });
  private readonly formVisibleSignal = signal<boolean>(false);
  private readonly editingOrderSignal = signal<Order | null>(null);
  private readonly clientsSignal = signal<Client[]>([]);

  readonly orders = computed(() => {
    const orders = this.ordersSignal();
    const { search, status } = this.filtersSignal();
    return orders.filter((order) => {
      const matchesSearch = search
        ? [order.code, order.description, order.vehicle, order.clientName ?? ''].some((value) =>
            value.toLowerCase().includes(search.toLowerCase())
          )
        : true;
      const matchesStatus = status ? order.status === status : true;
      return matchesSearch && matchesStatus;
    });
  });

  readonly statusOptions: { value: OrderStatus | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'aberta', label: 'Aberta' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
    { value: 'aguardando_pecas', label: 'Aguardando peças' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'entregue', label: 'Entregue' }
  ];

  readonly statusLabels: Record<OrderStatus, { label: string; class: string }> = {
    aberta: { label: 'Aberta', class: 'badge badge--open' },
    em_andamento: { label: 'Em andamento', class: 'badge badge--in-progress' },
    aguardando_aprovacao: { label: 'Aguardando aprovação', class: 'badge badge--waiting' },
    aguardando_pecas: { label: 'Aguardando peças', class: 'badge badge--waiting' },
    concluida: { label: 'Concluída', class: 'badge badge--completed' },
    entregue: { label: 'Entregue', class: 'badge badge--completed' }
  };

  readonly orderStatusOptions = this.statusOptions.filter((option) => option.value !== '');

  readonly orderForm: FormGroup = this.fb.group({
    id: [null],
    code: ['', [Validators.required, Validators.minLength(3)]],
    clientId: [null, Validators.required],
    vehicle: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(5)]],
    status: ['aberta', Validators.required],
    promisedDate: [''],
    laborTotal: [0, [Validators.required, Validators.min(0)]],
    partsTotal: [0, [Validators.required, Validators.min(0)]],
    additionalFees: [0, [Validators.min(0)]],
    discounts: [0, [Validators.min(0)]],
    total: [{ value: 0, disabled: true }],
    notes: [''],
    approvedByClient: [false]
  });

  readonly isAdmin = computed(() => this.authService.user()?.role === 'admin');
  readonly isFormVisible = computed(() => this.formVisibleSignal());
  readonly editingOrder = computed(() => this.editingOrderSignal());
  readonly clients = computed(() => this.clientsSignal());

  ngOnInit(): void {
    this.loadOrders();
    this.loadClients();

    this.filtersSignal.set(this.filterForm.value as OrderFilters);
    this.filterForm.valueChanges.subscribe((value) => {
      this.filtersSignal.set(value as OrderFilters);
    });

    this.orderForm.valueChanges.subscribe(() => this.recalculateTotal());
    this.recalculateTotal();
  }

  private loadOrders(): void {
    this.ordersService.list().subscribe((orders) => this.ordersSignal.set(orders));
  }

  private loadClients(): void {
    this.clientsService.list().subscribe((clients) => this.clientsSignal.set(clients));
  }

  openCreate(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.editingOrderSignal.set(null);
    this.orderForm.reset({
      id: null,
      code: '',
      clientId: null,
      vehicle: '',
      description: '',
      status: 'aberta',
      promisedDate: '',
      laborTotal: 0,
      partsTotal: 0,
      additionalFees: 0,
      discounts: 0,
      notes: '',
      approvedByClient: false
    });
    this.orderForm.get('total')?.setValue(0, { emitEvent: false });
    this.formVisibleSignal.set(true);
  }

  openEdit(order: Order): void {
    if (!this.isAdmin()) {
      return;
    }
    this.editingOrderSignal.set(order);
    this.orderForm.reset({
      id: order.id,
      code: order.code,
      clientId: order.clientId,
      vehicle: order.vehicle,
      description: order.description,
      status: order.status,
      promisedDate: order.promisedDate ? order.promisedDate.slice(0, 10) : '',
      laborTotal: order.summary.laborTotal,
      partsTotal: order.summary.partsTotal,
      additionalFees: order.summary.additionalFees,
      discounts: order.summary.discounts,
      notes: order.notes ?? '',
      approvedByClient: order.approvedByClient
    });
    this.orderForm.get('total')?.setValue(order.summary.total, { emitEvent: false });
    this.formVisibleSignal.set(true);
  }

  cancelForm(): void {
    this.orderForm.reset();
    this.orderForm.get('total')?.setValue(0, { emitEvent: false });
    this.formVisibleSignal.set(false);
    this.editingOrderSignal.set(null);
  }

  saveOrder(): void {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const { id, ...raw } = this.orderForm.getRawValue();
    const code = String(raw.code).trim();
    const vehicle = String(raw.vehicle).trim();
    const description = String(raw.description).trim();
    this.orderForm.patchValue({ code, vehicle, description });
    let hasError = false;
    if (!code) {
      this.orderForm.get('code')?.setErrors({ required: true });
      hasError = true;
    }
    if (!vehicle) {
      this.orderForm.get('vehicle')?.setErrors({ required: true });
      hasError = true;
    }
    if (!description) {
      this.orderForm.get('description')?.setErrors({ required: true });
      hasError = true;
    }
    if (hasError) {
      return;
    }

    const payload = {
      code,
      clientId: Number(raw.clientId),
      vehicle,
      description,
      status: raw.status as OrderStatus,
      promisedDate: raw.promisedDate ? new Date(raw.promisedDate).toISOString() : null,
      notes: raw.notes ? String(raw.notes).trim() : null,
      approvedByClient: !!raw.approvedByClient,
      summary: {
        laborTotal: Number(raw.laborTotal ?? 0),
        partsTotal: Number(raw.partsTotal ?? 0),
        additionalFees: Number(raw.additionalFees ?? 0),
        discounts: Number(raw.discounts ?? 0),
        total: Number(raw.total ?? 0)
      }
    };

    const editing = this.editingOrderSignal();
    const request = editing
      ? this.ordersService.update(editing.id, payload)
      : this.ordersService.create(payload);

    request.subscribe({
      next: () => {
        this.cancelForm();
        this.loadOrders();
      }
    });
  }

  deleteOrder(order: Order): void {
    if (!this.isAdmin()) {
      return;
    }

    const confirmed = window.confirm(`Deseja remover a OS ${order.code}?`);
    if (!confirmed) {
      return;
    }

    this.ordersService.remove(order.id).subscribe({
      next: () => {
        if (this.editingOrderSignal()?.id === order.id) {
          this.cancelForm();
        }
        this.loadOrders();
      }
    });
  }

  private recalculateTotal(): void {
    const { laborTotal, partsTotal, additionalFees, discounts, total } = this.orderForm.getRawValue();
    const computedTotal =
      Number(laborTotal ?? 0) + Number(partsTotal ?? 0) + Number(additionalFees ?? 0) - Number(discounts ?? 0);
    if (Math.abs(computedTotal - Number(total ?? 0)) > 0.009) {
      this.orderForm.get('total')?.setValue(Number(computedTotal.toFixed(2)), { emitEvent: false });
    }
  }
}
