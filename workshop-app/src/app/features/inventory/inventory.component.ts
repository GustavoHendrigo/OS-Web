import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { InventoryItem } from '../../core/models/inventory.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgFor, NgIf],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  private readonly inventoryService = inject(InventoryService);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly filterForm: FormGroup = this.fb.group({
    search: ['']
  });

  private readonly itemsSignal = signal<InventoryItem[]>([]);
  private readonly searchSignal = signal<string>('');
  private readonly editingItemSignal = signal<InventoryItem | null>(null);
  private readonly formVisibleSignal = signal<boolean>(false);

  readonly items = computed(() => {
    const search = this.searchSignal().trim().toLowerCase();
    if (!search) {
      return this.itemsSignal();
    }

    return this.itemsSignal().filter((item) =>
      [item.description, item.code, item.supplier, item.location]
        .map((value) => (value ?? '').toLowerCase())
        .some((value) => value.includes(search))
    );
  });

  readonly isAdmin = computed(() => this.authService.user()?.role === 'admin');

  readonly itemForm: FormGroup = this.fb.group({
    id: [null],
    code: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(3)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
    minQuantity: [0, [Validators.required, Validators.min(0)]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    location: [''],
    supplier: ['']
  });

  readonly isFormVisible = computed(() => this.formVisibleSignal());
  readonly editingItem = computed(() => this.editingItemSignal());

  ngOnInit(): void {
    this.loadInventory();
    this.searchSignal.set(this.filterForm.value.search as string);
    this.filterForm.valueChanges.subscribe((value) => {
      this.searchSignal.set((value.search as string) ?? '');
    });
  }

  private loadInventory(): void {
    this.inventoryService.list().subscribe((items) => this.itemsSignal.set(items));
  }

  openCreate(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.editingItemSignal.set(null);
    this.itemForm.reset({
      id: null,
      code: '',
      description: '',
      quantity: 0,
      minQuantity: 0,
      unitCost: 0,
      location: '',
      supplier: ''
    });
    this.formVisibleSignal.set(true);
  }

  openEdit(item: InventoryItem): void {
    if (!this.isAdmin()) {
      return;
    }
    this.editingItemSignal.set(item);
    this.itemForm.reset({ ...item });
    this.formVisibleSignal.set(true);
  }

  cancelForm(): void {
    this.itemForm.reset();
    this.formVisibleSignal.set(false);
    this.editingItemSignal.set(null);
  }

  saveItem(): void {
    if (!this.isAdmin()) {
      return;
    }
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const { id, ...raw } = this.itemForm.getRawValue();
    const code = String(raw.code).trim();
    const description = String(raw.description).trim();
    this.itemForm.get('code')?.setValue(code);
    this.itemForm.get('description')?.setValue(description);
    if (!code || !description) {
      if (!code) {
        this.itemForm.get('code')?.setErrors({ required: true });
      }
      if (!description) {
        this.itemForm.get('description')?.setErrors({ required: true });
      }
      return;
    }

    const payload: Partial<InventoryItem> = {
      code,
      description,
      quantity: Number(raw.quantity ?? 0),
      minQuantity: Number(raw.minQuantity ?? 0),
      unitCost: Number(raw.unitCost ?? 0),
      location: raw.location ? String(raw.location).trim() : null,
      supplier: raw.supplier ? String(raw.supplier).trim() : null
    };

    const editing = this.editingItemSignal();
    const request = editing
      ? this.inventoryService.update(editing.id, payload)
      : this.inventoryService.create(payload);

    request.subscribe({
      next: () => {
        this.cancelForm();
        this.loadInventory();
      }
    });
  }

  deleteItem(item: InventoryItem): void {
    if (!this.isAdmin()) {
      return;
    }

    const confirmed = window.confirm(`Deseja remover o item ${item.description}?`);
    if (!confirmed) {
      return;
    }

    this.inventoryService.remove(item.id).subscribe({
      next: () => {
        if (this.editingItemSignal()?.id === item.id) {
          this.cancelForm();
        }
        this.loadInventory();
      }
    });
  }
}
