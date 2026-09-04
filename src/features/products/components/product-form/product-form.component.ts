import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import type {
  CreateProductPayload,
  Product,
  ProductStatus,
  UpdateProductPayload,
} from '../../models/product.model';
import { PRODUCT_STATUS_OPTIONS } from '../../constants/products.constants';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

export interface SelectOption {
  value: string;
  label: string;
  subcategories?: SelectOption[];
}

export type ProductFormPayload = CreateProductPayload | UpdateProductPayload;

export interface ProductFormSubmit {
  payload: ProductFormPayload;
  file: File | null;
  removeImage: boolean;
}

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ImageUploadComponent],
})
export class ProductFormComponent {
  readonly product = input<Product | null>(null);
  readonly isCreate = input<boolean>(true);
  readonly categories = input<SelectOption[]>([]);
  readonly brands = input<SelectOption[]>([]);
  readonly submitting = input<boolean>(false);

  readonly submitted = output<ProductFormSubmit>();
  readonly cancelled = output<void>();

  protected readonly statusOptions = PRODUCT_STATUS_OPTIONS;

  /** Archivo de imagen pendiente de subir (flujo presigned -> PUT -> imageKey). */
  protected readonly selectedFile = signal<File | null>(null);
  /** Intención de eliminar la imagen actual al guardar. */
  protected readonly removeImage = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', { validators: [Validators.required] }),
    sku: new FormControl(''),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    categoryId: new FormControl('', { validators: [Validators.required] }),
    subcategoryId: new FormControl(''),
    brandId: new FormControl(''),
    unit: new FormControl(''),
    unitQuantity: new FormControl<number | null>(null, {
      validators: [
        (control) => {
          const v = control.value;
          if (v === null || v === undefined || v === '') return null;
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) return { min: true };
          return null;
        },
      ],
    }),
    description: new FormControl(''),
    status: new FormControl<ProductStatus>('active', { validators: [Validators.required] }),
    isAvailable: new FormControl(true),
    stock: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    minStock: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
  });

  constructor() {
    effect(() => {
      const product = this.product();
      if (!product) return;
      this.form.patchValue({
        name: product.name,
        sku: product.sku,
        price: product.price,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId ?? '',
        brandId: product.brandId ?? '',
        unit: product.unit ?? '',
        unitQuantity: product.unitQuantity ?? null,
        description: product.description ?? '',
        status: product.status,
        isAvailable: product.isAvailable,
      });
    });
  }

  protected subcategories(): SelectOption[] {
    const category = this.categories().find(
      (option) => option.value === this.form.controls.categoryId.value,
    );
    return category?.subcategories ?? [];
  }

  protected onCategoryChange(): void {
    const selected = this.form.controls.subcategoryId.value;
    if (!this.subcategories().some((option) => option.value === selected)) {
      this.form.controls.subcategoryId.setValue('');
    }
  }

  protected onFileChange(file: File | null): void {
    this.selectedFile.set(file);
    if (file) {
      this.removeImage.set(false);
    }
  }

  protected onRemoveChange(remove: boolean): void {
    this.removeImage.set(remove);
    if (remove) {
      this.selectedFile.set(null);
    }
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.submitted.emit({
      payload: this.isCreate() ? this.toCreatePayload() : this.toUpdatePayload(),
      file: this.selectedFile(),
      removeImage: this.removeImage(),
    });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty || this.selectedFile() !== null || this.removeImage();
  }

  private toCreatePayload(): CreateProductPayload {
    const c = this.form.controls;
    return {
      name: c.name.value?.trim() ?? '',
      price: this.price(c.price),
      categoryId: c.categoryId.value ?? '',
      subcategoryId: optional(c.subcategoryId.value) ?? null,
      sku: optional(c.sku.value),
      brandId: optional(c.brandId.value),
      unit: optional(c.unit.value),
      unitQuantity: nullableNumber(c.unitQuantity.value),
      description: optional(c.description.value),
      status: c.status.value ?? 'active',
      isAvailable: c.isAvailable.value ?? true,
      stock: nullableNumber(c.stock.value),
      minStock: nullableNumber(c.minStock.value),
    };
  }

  private toUpdatePayload(): UpdateProductPayload {
    const c = this.form.controls;
    const brandValue = c.brandId.value?.trim();
    return {
      name: c.name.value?.trim() ?? '',
      price: this.price(c.price),
      categoryId: c.categoryId.value ?? '',
      subcategoryId: optional(c.subcategoryId.value) ?? null,
      sku: optional(c.sku.value),
      brandId: brandValue ? brandValue : null,
      unit: optional(c.unit.value),
      unitQuantity: nullableNumber(c.unitQuantity.value),
      description: optional(c.description.value),
      status: c.status.value ?? 'active',
      isAvailable: c.isAvailable.value ?? true,
    };
  }

  private price(control: FormControl<number | null>): number {
    return control.value === null || control.value === undefined ? 0 : Number(control.value);
  }
}

function optional(value: string | null | undefined): string | undefined {
  return value && value.trim() ? value.trim() : undefined;
}

function nullableNumber(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  return Number(value);
}
