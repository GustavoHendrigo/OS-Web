import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ServiceOrder,
  ServiceOrderPayload,
  ServiceOrderStatus
} from '../models/service-order.model';

@Injectable({ providedIn: 'root' })
export class ServiceOrderService {
  private http = inject(HttpClient);

  private readonly statusLabels: Record<ServiceOrderStatus, string> = {
    aguardando_aprovacao: 'Aguardando aprovação',
    em_andamento: 'Em andamento',
    finalizada: 'Finalizada',
    entregue: 'Entregue'
  };

  list(): Observable<ServiceOrder[]> {
    return this.http
      .get<ServiceOrder[]>(`${environment.apiUrl}/service-orders`)
      .pipe(map((orders) => orders.map((order) => this.decorate(order))));
  }

  getById(id: number): Observable<ServiceOrder> {
    return this.http
      .get<ServiceOrder>(`${environment.apiUrl}/service-orders/${id}`)
      .pipe(map((order) => this.decorate(order)));
  }

  create(payload: ServiceOrderPayload): Observable<ServiceOrder> {
    return this.http
      .post<ServiceOrder>(`${environment.apiUrl}/service-orders`, payload)
      .pipe(map((order) => this.decorate(order)));
  }

  updateStatus(id: number, status: ServiceOrderStatus): Observable<ServiceOrder> {
    return this.http
      .patch<ServiceOrder>(`${environment.apiUrl}/service-orders/${id}/status`, { status })
      .pipe(map((order) => this.decorate(order)));
  }

  private decorate(order: ServiceOrder): ServiceOrder {
    return {
      ...order,
      statusLabel: this.statusLabels[order.status] ?? order.status
    };
  }
}
