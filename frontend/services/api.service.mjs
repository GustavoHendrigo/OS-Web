import { Injectable, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { HttpClient } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/http.mjs';

const API_BASE = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  http = inject(HttpClient);

  login(credentials) {
    return this.http.post(`${API_BASE}/login`, credentials);
  }

  getDashboard() {
    return this.http.get(`${API_BASE}/dashboard`);
  }

  getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    const suffix = query ? `?${query}` : '';
    return this.http.get(`${API_BASE}/orders${suffix}`);
  }

  getOrder(id) {
    return this.http.get(`${API_BASE}/orders/${id}`);
  }

  createOrder(payload) {
    return this.http.post(`${API_BASE}/orders`, payload);
  }

  updateOrder(id, payload) {
    return this.http.put(`${API_BASE}/orders/${id}`, payload);
  }

  deleteOrder(id) {
    return this.http.delete(`${API_BASE}/orders/${id}`);
  }

  getClients(params = {}) {
    const query = new URLSearchParams(params).toString();
    const suffix = query ? `?${query}` : '';
    return this.http.get(`${API_BASE}/clients${suffix}`);
  }

  createClient(payload) {
    return this.http.post(`${API_BASE}/clients`, payload);
  }

  updateClient(id, payload) {
    return this.http.put(`${API_BASE}/clients/${id}`, payload);
  }

  deleteClient(id) {
    return this.http.delete(`${API_BASE}/clients/${id}`);
  }

  getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    const suffix = query ? `?${query}` : '';
    return this.http.get(`${API_BASE}/inventory${suffix}`);
  }

  createInventoryItem(payload) {
    return this.http.post(`${API_BASE}/inventory`, payload);
  }

  updateInventoryItem(id, payload) {
    return this.http.put(`${API_BASE}/inventory/${id}`, payload);
  }

  deleteInventoryItem(id) {
    return this.http.delete(`${API_BASE}/inventory/${id}`);
  }
}
