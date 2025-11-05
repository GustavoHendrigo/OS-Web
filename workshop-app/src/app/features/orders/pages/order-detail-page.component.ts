import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { OrdersService } from '../../../core/services/orders.service';
import { Order } from '../../../core/models/order.model';
import { Subscription } from 'rxjs';
import { OrderSummaryComponent } from '../components/order-summary/order-summary.component';

@Component({
  selector: 'app-order-detail-page',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, CurrencyPipe, DatePipe, RouterLink, OrderSummaryComponent],
  templateUrl: './order-detail-page.component.html',
  styleUrls: ['./order-detail-page.component.scss']
})
export class OrderDetailPageComponent implements OnInit, OnDestroy {
  private readonly ordersService = inject(OrdersService);
  private readonly route = inject(ActivatedRoute);

  readonly order = signal<Order | null>(null);
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (Number.isFinite(id)) {
        this.ordersService.findById(id).subscribe((order) => this.order.set(order));
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
