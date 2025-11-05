import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Order } from '../models/order.model';

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
}
