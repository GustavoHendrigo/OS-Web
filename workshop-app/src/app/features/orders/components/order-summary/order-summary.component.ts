import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe, NgFor } from '@angular/common';
import { Order } from '../../../../core/models/order.model';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, NgFor, CurrencyPipe],
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})
export class OrderSummaryComponent {
  @Input({ required: true }) order!: Order;

  print(): void {
    if (typeof document === 'undefined') {
      window.print();
      return;
    }

    document.body.classList.add('print-order-summary');
    window.print();
    setTimeout(() => document.body.classList.remove('print-order-summary'), 0);
  }
}
