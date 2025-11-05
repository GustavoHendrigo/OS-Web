import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Client } from '../../models/client.model';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-clients-page',
  templateUrl: './clients-page.component.html',
  styleUrls: ['./clients-page.component.scss']
})
export class ClientsPageComponent implements OnInit {
  clients: Client[] = [];
  loading = false;
  error?: string;
  searchTerm = '';

  form: FormGroup;
  formVisible = false;
  editingClient?: Client;
  saving = false;
  saveError?: string;

  constructor(private apiService: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      vehicleInfo: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.error = undefined;
    this.apiService.getClients(this.searchTerm).subscribe({
      next: clients => {
        this.clients = clients;
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar os clientes.';
        this.loading = false;
      }
    });
  }

  toggleForm(client?: Client): void {
    this.formVisible = !this.formVisible;
    this.saveError = undefined;
    if (!this.formVisible) {
      this.editingClient = undefined;
      this.form.reset();
      return;
    }

    if (client) {
      this.editingClient = client;
      this.form.patchValue(client);
    } else {
      this.editingClient = undefined;
      this.form.reset();
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.saveError = undefined;

    const payload = this.form.value;

    if (this.editingClient) {
      this.apiService.updateClient(this.editingClient.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.formVisible = false;
          this.loadClients();
        },
        error: () => {
          this.saving = false;
          this.saveError = 'Não foi possível atualizar o cliente.';
        }
      });
    } else {
      this.apiService.createClient(payload).subscribe({
        next: () => {
          this.saving = false;
          this.formVisible = false;
          this.loadClients();
        },
        error: () => {
          this.saving = false;
          this.saveError = 'Não foi possível cadastrar o cliente.';
        }
      });
    }
  }
}
