import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CreateOrderPayload, Order, UpdateOrderPayload } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/orders`;

  list(filter?: { status?: string; search?: string }): Observable<Order[]> {
    let params = new HttpParams();
    if (filter?.status) {
      params = params.set('status', filter.status);
    }
    if (filter?.search) {
      params = params.set('search', filter.search);
    }
    return this.http.get<Order[]>(this.baseUrl, { params });
  }

  findById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateOrderPayload): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
