import { CommonModule, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ServiceOrderService } from '../../services/service-order.service';
import { ServiceOrder } from '../../models/service-order.model';
import { formatCurrency } from '../../utils/formatters';

@Component({
  selector: 'app-service-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIf, NgFor, DatePipe],
  templateUrl: './service-order-detail.component.html',
  styleUrls: ['./service-order-detail.component.scss']
})
export class ServiceOrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private serviceOrderService = inject(ServiceOrderService);

  loading = signal<boolean>(true);
  order = signal<ServiceOrder | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.serviceOrderService.getById(id).subscribe((order) => {
      this.order.set(order);
      this.loading.set(false);
    });
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }

  print(): void {
    window.print();
  }
}
