import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';
import { InventoryItem } from '../../core/models/inventory.model';

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

  readonly filterForm: FormGroup = this.fb.group({
    search: ['']
  });

  private readonly itemsSignal = signal<InventoryItem[]>([]);
  private readonly searchSignal = signal<string>('');

  readonly items = computed(() => {
    const search = this.searchSignal();
    return this.itemsSignal().filter((item) =>
      search
        ? [item.description, item.code, item.supplier, item.location].some((value) =>
            value.toLowerCase().includes(search.toLowerCase())
          )
        : true
    );
  });

  ngOnInit(): void {
    this.inventoryService.list().subscribe((items) => this.itemsSignal.set(items));
    this.searchSignal.set(this.filterForm.value.search as string);
    this.filterForm.valueChanges.subscribe((value) => {
      this.searchSignal.set((value.search as string) ?? '');
    });
  }
}
