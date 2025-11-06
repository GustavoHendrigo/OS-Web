import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Client } from '../../models/client.model';
import { ClientService } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  authService = inject(AuthService);

  clients = signal<Client[]>([]);
  loading = signal<boolean>(true);
  searchTerm = signal<string>('');
  editingClientId = signal<number | null>(null);

  clientForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    document: ['', Validators.required],
    vehicle: ['', Validators.required]
  });

  filteredClients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.clients().filter((client) =>
      !term ||
      client.name.toLowerCase().includes(term) ||
      client.phone.toLowerCase().includes(term) ||
      client.vehicle.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.clientService.list().subscribe((clients) => {
      this.clients.set(clients);
      this.loading.set(false);
    });
  }

  startCreate(): void {
    this.clientForm.reset();
    this.editingClientId.set(null);
  }

  editClient(client: Client): void {
    this.editingClientId.set(client.id);
    this.clientForm.reset({
      name: client.name,
      phone: client.phone,
      email: client.email,
      document: client.document,
      vehicle: client.vehicle
    });
  }

  submit(): void {
    if (!this.authService.hasRole('admin')) {
      return;
    }
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const payload = this.clientForm.getRawValue();
    const editingId = this.editingClientId();

    if (editingId) {
      this.clientService.update(editingId, payload).subscribe((updated) => {
        this.clients.update((list) => list.map((client) => (client.id === updated.id ? updated : client)));
        this.startCreate();
      });
    } else {
      this.clientService.create(payload).subscribe((created) => {
        this.clients.update((list) => [created, ...list]);
        this.startCreate();
      });
    }
  }

  remove(client: Client): void {
    if (!this.authService.hasRole('admin')) {
      return;
    }
    if (!confirm(`Remover o cliente ${client.name}?`)) {
      return;
    }
    this.clientService.remove(client.id).subscribe(() => {
      this.clients.update((list) => list.filter((item) => item.id !== client.id));
    });
  }
}
