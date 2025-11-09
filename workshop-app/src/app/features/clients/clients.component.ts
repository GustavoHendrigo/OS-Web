import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientsService } from '../../core/services/clients.service';
import { Client } from '../../core/models/client.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgFor, NgIf],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  private readonly clientsService = inject(ClientsService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly filterForm: FormGroup = this.fb.group({
    search: ['']
  });

  private readonly clientsSignal = signal<Client[]>([]);
  private readonly searchSignal = signal<string>('');
  private readonly editingClientSignal = signal<Client | null>(null);
  private readonly formVisibleSignal = signal<boolean>(false);

  readonly clients = computed(() => {
    const search = this.searchSignal().trim().toLowerCase();
    if (!search) {
      return this.clientsSignal();
    }

    return this.clientsSignal().filter((client) =>
      [client.name, client.email, client.phone, client.vehicles]
        .map((value) => (value ?? '').toLowerCase())
        .some((value) => value.includes(search))
    );
  });

  readonly isAdmin = computed(() => this.authService.user()?.role === 'admin');

  readonly clientForm: FormGroup = this.fb.group({
    id: [null],
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: [''],
    email: ['', Validators.email],
    document: [''],
    vehicles: [''],
    notes: ['']
  });

  readonly isFormVisible = computed(() => this.formVisibleSignal());
  readonly editingClient = computed(() => this.editingClientSignal());

  ngOnInit(): void {
    this.loadClients();
    this.searchSignal.set(this.filterForm.value.search as string);
    this.filterForm.valueChanges.subscribe((value) => {
      this.searchSignal.set((value.search as string) ?? '');
    });
  }

  private loadClients(): void {
    this.clientsService.list().subscribe((clients) => this.clientsSignal.set(clients));
  }

  openCreate(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.editingClientSignal.set(null);
    this.clientForm.reset({
      id: null,
      name: '',
      phone: '',
      email: '',
      document: '',
      vehicles: '',
      notes: ''
    });
    this.formVisibleSignal.set(true);
  }

  openEdit(client: Client): void {
    if (!this.isAdmin()) {
      return;
    }
    this.editingClientSignal.set(client);
    this.clientForm.reset({ ...client });
    this.formVisibleSignal.set(true);
  }

  cancelForm(): void {
    this.clientForm.reset();
    this.formVisibleSignal.set(false);
    this.editingClientSignal.set(null);
  }

  saveClient(): void {
    if (!this.isAdmin()) {
      return;
    }
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      return;
    }

    const { id, ...raw } = this.clientForm.getRawValue();
    const name = (raw.name as string).trim();
    this.clientForm.get('name')?.setValue(name);
    if (!name) {
      this.clientForm.get('name')?.setErrors({ required: true });
      return;
    }

    const payload: Partial<Client> = {
      name,
      phone: raw.phone ? String(raw.phone).trim() : null,
      email: raw.email ? String(raw.email).trim() : null,
      document: raw.document ? String(raw.document).trim() : null,
      vehicles: raw.vehicles ? String(raw.vehicles).trim() : null,
      notes: raw.notes ? String(raw.notes).trim() : null
    };

    const editing = this.editingClientSignal();

    const request = editing
      ? this.clientsService.update(editing.id, payload)
      : this.clientsService.create(payload);

    request.subscribe({
      next: () => {
        this.cancelForm();
        this.loadClients();
      }
    });
  }

  deleteClient(client: Client): void {
    if (!this.isAdmin()) {
      return;
    }

    const confirmed = window.confirm(`Deseja realmente remover o cliente ${client.name}?`);
    if (!confirmed) {
      return;
    }

    this.clientsService.remove(client.id).subscribe({
      next: () => {
        if (this.editingClientSignal()?.id === client.id) {
          this.cancelForm();
        }
        this.loadClients();
      }
    });
  }
}
