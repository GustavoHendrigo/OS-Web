import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardSummary, ServiceOrderDetails, ServiceOrderSummary, CreateServiceOrderRequest, UpdateServiceOrderRequest } from '../models/service-order.models';
import { Client, SaveClientRequest } from '../models/client.model';
import { InventoryItem, SaveInventoryItemRequest } from '../models/inventory.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.apiUrl}/dashboard`);
  }

  getServiceOrders(filters?: { status?: string; search?: string }): Observable<ServiceOrderSummary[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    return this.http.get<ServiceOrderSummary[]>(`${this.apiUrl}/service-orders`, { params });
  }

  getServiceOrderById(id: number): Observable<ServiceOrderDetails> {
    return this.http.get<ServiceOrderDetails>(`${this.apiUrl}/service-orders/${id}`);
  }

  createServiceOrder(payload: CreateServiceOrderRequest): Observable<ServiceOrderDetails> {
    return this.http.post<ServiceOrderDetails>(`${this.apiUrl}/service-orders`, payload);
  }

  updateServiceOrder(payload: UpdateServiceOrderRequest): Observable<ServiceOrderDetails> {
    return this.http.put<ServiceOrderDetails>(`${this.apiUrl}/service-orders/${payload.id}`, payload);
  }

  getClients(search?: string): Observable<Client[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<Client[]>(`${this.apiUrl}/clients`, { params });
  }

  createClient(payload: SaveClientRequest): Observable<Client> {
    return this.http.post<Client>(`${this.apiUrl}/clients`, payload);
  }

  updateClient(id: number, payload: SaveClientRequest): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/clients/${id}`, payload);
  }

  getInventory(search?: string): Observable<InventoryItem[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/inventory`, { params });
  }

  createInventoryItem(payload: SaveInventoryItemRequest): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(`${this.apiUrl}/inventory`, payload);
  }

  updateInventoryItem(id: number, payload: SaveInventoryItemRequest): Observable<InventoryItem> {
    return this.http.put<InventoryItem>(`${this.apiUrl}/inventory/${id}`, payload);
  }
}
