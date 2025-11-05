import { Component, OnInit, inject } from 'https://cdn.jsdelivr.net/npm/@angular/core@17.2.0/fesm2022/core.mjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from 'https://cdn.jsdelivr.net/npm/@angular/forms@17.2.0/fesm2022/forms.mjs';
import { NgFor, NgIf } from 'https://cdn.jsdelivr.net/npm/@angular/common@17.2.0/fesm2022/common.mjs';
import { ApiService } from '../services/api.service.mjs';
import { AuthService } from '../services/auth.service.mjs';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ReactiveFormsModule],
  template: `
    <section class="card">
      <h2>Controle de estoque</h2>
      <div class="toolbar">
        <input placeholder="Pesquisar itens" [(ngModel)]="searchTerm" (input)="load()" />
        <button class="btn" *ngIf="canManage" (click)="toggleForm()">{{ showForm ? 'Fechar formulário' : 'Novo item' }}</button>
      </div>
      <form class="card" *ngIf="showForm" [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid">
          <div>
            <label>Nome</label>
            <input formControlName="name" required />
          </div>
          <div>
            <label>Quantidade</label>
            <input type="number" min="0" formControlName="quantity" />
          </div>
        </div>
        <div class="grid">
          <div>
            <label>Valor unitário</label>
            <input type="number" step="0.01" formControlName="unit_price" />
          </div>
          <div>
            <label>Descrição</label>
            <input formControlName="description" />
          </div>
        </div>
        <div style="margin-top:1rem;">
          <button class="btn" type="submit" [disabled]="form.invalid">Salvar</button>
        </div>
      </form>
      <table class="table" *ngIf="items.length; else empty">
        <thead>
          <tr>
            <th>Item</th>
            <th>Descrição</th>
            <th>Quantidade</th>
            <th>Valor unitário</th>
            <th>Valor total</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of items">
            <td>{{ item.name }}</td>
            <td>{{ item.description }}</td>
            <td>{{ item.quantity }}</td>
            <td>R$ {{ item.unit_price | number:'1.2-2' }}</td>
            <td>R$ {{ (item.unit_price * item.quantity) | number:'1.2-2' }}</td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p>Nenhum item encontrado.</p>
      </ng-template>
    </section>
  `,
})
export class InventoryComponent implements OnInit {
  api = inject(ApiService);
  fb = inject(FormBuilder);
  auth = inject(AuthService);

  items = [];
  searchTerm = '';
  showForm = false;

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    quantity: [0],
    unit_price: [0],
  });

  get canManage() {
    return this.auth.hasRole('admin');
  }

  ngOnInit() {
    this.load();
  }

  load() {
    const params = {};
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }
    this.api.getInventory(params).subscribe((items) => (this.items = items));
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.form.reset({ name: '', description: '', quantity: 0, unit_price: 0 });
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.api.createInventoryItem(this.form.getRawValue()).subscribe(() => {
      this.toggleForm();
      this.load();
    });
  }
}
