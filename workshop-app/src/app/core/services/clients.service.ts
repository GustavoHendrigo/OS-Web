import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from '../models/client.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clients`;

  list(search?: string): Observable<Client[]> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Client[]>(this.baseUrl, { params });
  }

  create(payload: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
