import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Client, ClientPayload } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);

  list(): Observable<Client[]> {
    return this.http.get<Client[]>(`${environment.apiUrl}/clients`);
  }

  create(payload: ClientPayload): Observable<Client> {
    return this.http.post<Client>(`${environment.apiUrl}/clients`, payload);
  }

  update(id: number, payload: ClientPayload): Observable<Client> {
    return this.http.put<Client>(`${environment.apiUrl}/clients/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/clients/${id}`);
  }
}
