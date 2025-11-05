import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { InventoryItem, InventoryItemPayload } from '../models/inventory-item.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);

  list(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${environment.apiUrl}/inventory`);
  }

  create(payload: InventoryItemPayload): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(`${environment.apiUrl}/inventory`, payload);
  }

  update(id: number, payload: InventoryItemPayload): Observable<InventoryItem> {
    return this.http.put<InventoryItem>(`${environment.apiUrl}/inventory/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/inventory/${id}`);
  }
}
