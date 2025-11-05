import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersService } from '../../../core/services/orders.service';
import { Order, OrderStatus } from '../../../core/models/order.model';

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

  readonly filterForm: FormGroup = this.fb.group({
    search: [''],
    status: ['']
  });

  private readonly ordersSignal = signal<Order[]>([]);
  private readonly filtersSignal = signal<OrderFilters>({ search: '', status: '' });

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

  ngOnInit(): void {
    this.ordersService.list().subscribe((orders) => this.ordersSignal.set(orders));

    this.filtersSignal.set(this.filterForm.value as OrderFilters);
    this.filterForm.valueChanges.subscribe((value) => {
      this.filtersSignal.set(value as OrderFilters);
    });
  }
}
