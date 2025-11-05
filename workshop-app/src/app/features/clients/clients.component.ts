import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ClientsService } from '../../core/services/clients.service';
import { Client } from '../../core/models/client.model';

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

  readonly filterForm: FormGroup = this.fb.group({
    search: ['']
  });

  private readonly clientsSignal = signal<Client[]>([]);
  private readonly searchSignal = signal<string>('');

  readonly clients = computed(() => {
    const search = this.searchSignal();
    return this.clientsSignal().filter((client) =>
      search
        ? [client.name, client.email, client.phone, client.vehicles].some((value) =>
            value.toLowerCase().includes(search.toLowerCase())
          )
        : true
    );
  });

  ngOnInit(): void {
    this.clientsService.list().subscribe((clients) => this.clientsSignal.set(clients));
    this.searchSignal.set(this.filterForm.value.search as string);
    this.filterForm.valueChanges.subscribe((value) => {
      this.searchSignal.set((value.search as string) ?? '');
    });
  }
}
