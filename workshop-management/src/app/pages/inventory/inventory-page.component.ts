import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryItem } from '../../models/inventory.model';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-inventory-page',
  templateUrl: './inventory-page.component.html',
  styleUrls: ['./inventory-page.component.scss']
})
export class InventoryPageComponent implements OnInit {
  items: InventoryItem[] = [];
  loading = false;
  error?: string;
  searchTerm = '';

  form: FormGroup;
  formVisible = false;
  editingItem?: InventoryItem;
  saving = false;
  saveError?: string;

  constructor(private apiService: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      partNumber: [''],
      quantity: [0, [Validators.required, Validators.min(0)]],
      minimumStock: [0, [Validators.min(0)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      location: ['']
    });
  }

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.error = undefined;
    this.apiService.getInventory(this.searchTerm).subscribe({
      next: items => {
        this.items = items;
        this.loading = false;
      },
      error: () => {
        this.error = 'Não foi possível carregar o estoque.';
        this.loading = false;
      }
    });
  }

  toggleForm(item?: InventoryItem): void {
    this.formVisible = !this.formVisible;
    this.saveError = undefined;
    if (!this.formVisible) {
      this.editingItem = undefined;
      this.form.reset({ quantity: 0, minimumStock: 0, unitPrice: 0 });
      return;
    }

    if (item) {
      this.editingItem = item;
      this.form.patchValue(item);
    } else {
      this.editingItem = undefined;
      this.form.reset({ quantity: 0, minimumStock: 0, unitPrice: 0 });
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

    if (this.editingItem) {
      this.apiService.updateInventoryItem(this.editingItem.id, payload).subscribe({
        next: () => {
          this.saving = false;
          this.formVisible = false;
          this.loadItems();
        },
        error: () => {
          this.saving = false;
          this.saveError = 'Não foi possível atualizar o item.';
        }
      });
    } else {
      this.apiService.createInventoryItem(payload).subscribe({
        next: () => {
          this.saving = false;
          this.formVisible = false;
          this.loadItems();
        },
        error: () => {
          this.saving = false;
          this.saveError = 'Não foi possível cadastrar o item.';
        }
      });
    }
  }

  isLowStock(item: InventoryItem): boolean {
    if (item.minimumStock == null) {
      return false;
    }
    return item.quantity <= item.minimumStock;
  }
}
