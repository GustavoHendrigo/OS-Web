import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryItem } from '../../models/inventory-item.model';
import { InventoryService } from '../../services/inventory.service';
import { formatCurrency } from '../../utils/formatters';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  authService = inject(AuthService);

  items = signal<InventoryItem[]>([]);
  loading = signal<boolean>(true);
  searchTerm = signal<string>('');
  editingItemId = signal<number | null>(null);

  itemForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    sku: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(0)]],
    minimumQuantity: [0, [Validators.required, Validators.min(0)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    location: [''],
    supplier: ['']
  });

  filteredItems = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.items().filter((item) =>
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.inventoryService.list().subscribe((items) => {
      this.items.set(items);
      this.loading.set(false);
    });
  }

  startCreate(): void {
    this.itemForm.reset({
      name: '',
      sku: '',
      quantity: 0,
      minimumQuantity: 0,
      unitPrice: 0,
      location: '',
      supplier: ''
    });
    this.editingItemId.set(null);
  }

  edit(item: InventoryItem): void {
    this.editingItemId.set(item.id);
    this.itemForm.reset({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      minimumQuantity: item.minimumQuantity ?? 0,
      unitPrice: item.unitPrice ?? 0,
      location: item.location ?? '',
      supplier: item.supplier ?? ''
    });
  }

  submit(): void {
    if (!this.authService.hasRole('admin')) {
      return;
    }
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const payload = this.itemForm.getRawValue();
    const editingId = this.editingItemId();

    if (editingId) {
      this.inventoryService.update(editingId, payload).subscribe((updated) => {
        this.items.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.startCreate();
      });
    } else {
      this.inventoryService.create(payload).subscribe((created) => {
        this.items.update((list) => [created, ...list]);
        this.startCreate();
      });
    }
  }

  remove(item: InventoryItem): void {
    if (!this.authService.hasRole('admin')) {
      return;
    }
    if (!confirm(`Remover o item ${item.name}?`)) {
      return;
    }
    this.inventoryService.remove(item.id).subscribe(() => {
      this.items.update((list) => list.filter((current) => current.id !== item.id));
    });
  }

  formatMoney(value: number): string {
    return formatCurrency(value);
  }
}
