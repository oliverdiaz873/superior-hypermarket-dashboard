import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type ValidationErrors,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

import { OffersStore } from '../../state/offers.store';
import type { CreateOfferPayload, Offer, UpdateOfferPayload } from '../../models/offer.model';
import { toLocalDatetimeInput } from '../../constants/offer.constants';
import { ProductSelectorComponent } from '@shared/components/product-selector/product-selector.component';
import type { Product } from '@features/products/models/product.model';

export interface OfferFormDialogData {
  /** Presente en edición; ausente al crear. */
  offer?: Offer;
}

const discountMustBeLess = (control: AbstractControl): ValidationErrors | null => {
  const original = control.get('originalPrice')?.value;
  const discount = control.get('discountPrice')?.value;
  if (original === null || original === undefined || discount === null || discount === undefined) {
    return null;
  }
  if (Number(original) >= 0 && Number(discount) >= 0 && Number(discount) >= Number(original)) {
    return { discountNotLess: true };
  }
  return null;
};

const dateRangeValid = (control: AbstractControl): ValidationErrors | null => {
  const start = control.get('startDate')?.value;
  const end = control.get('endDate')?.value;
  if (!start || !end) return null;
  if (new Date(start).getTime() > new Date(end).getTime()) {
    return { dateRangeInvalid: true };
  }
  return null;
};

@Component({
  selector: 'app-offer-form-dialog',
  templateUrl: './offer-form-dialog.component.html',
  styleUrl: './offer-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    ProductSelectorComponent,
  ],
})
export class OfferFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<OfferFormDialogComponent>);
  private readonly data = inject<OfferFormDialogData>(MAT_DIALOG_DATA);
  protected readonly store = inject(OffersStore);

  protected readonly isEdit = computed(() => Boolean(this.data.offer));
  protected readonly submitting = signal(false);
  protected readonly selectedProduct = signal<Product | null>(null);

  protected readonly form = new FormGroup(
    {
      productId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      originalPrice: new FormControl<number | null>(null, {
        validators: [Validators.required, Validators.min(0)],
      }),
      discountPrice: new FormControl<number | null>(null, {
        validators: [Validators.required, Validators.min(0)],
      }),
      startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      endDate: new FormControl('', { nonNullable: true }),
      title: new FormControl('', { nonNullable: true }),
      isActive: new FormControl(true, { nonNullable: true }),
    },
    { validators: [discountMustBeLess, dateRangeValid] },
  );

  constructor() {
    if (this.data.offer) {
      this.form.patchValue({
        productId: this.data.offer.productId,
        originalPrice: this.data.offer.originalPrice,
        discountPrice: this.data.offer.discountPrice,
        startDate: toLocalDatetimeInput(this.data.offer.startDate),
        endDate: toLocalDatetimeInput(this.data.offer.endDate),
        title: this.data.offer.title ?? '',
        isActive: this.data.offer.isActive,
      });
    }
  }

  protected onProductSelected(product: Product | null): void {
    if (product) {
      this.selectedProduct.set(product);
      this.form.controls.productId.setValue(product.id);
      this.form.controls.productId.markAsTouched();
    } else {
      this.selectedProduct.set(null);
      this.form.controls.productId.setValue('');
      this.form.controls.productId.markAsTouched();
    }
  }

  protected discountPercentage(): number {
    const original = this.form.get('originalPrice')?.value;
    const discount = this.form.get('discountPrice')?.value;
    if (!original || discount === null || discount === undefined) return 0;
    if (Number(original) <= 0) return 0;
    return Math.round(((Number(original) - Number(discount)) / Number(original)) * 100);
  }

  protected async onSubmit(): Promise<void> {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      const result = this.data.offer
        ? await this.store.update(this.data.offer.id, this.buildPayload() as UpdateOfferPayload)
        : await this.store.create(this.buildPayload() as CreateOfferPayload);
      if (result) this.dialogRef.close(result);
    } finally {
      this.submitting.set(false);
    }
  }

  private buildPayload(): CreateOfferPayload | UpdateOfferPayload {
    const value = this.form.getRawValue();
    return {
      productId: value.productId,
      originalPrice: Number(value.originalPrice),
      discountPrice: Number(value.discountPrice),
      startDate: value.startDate || undefined,
      endDate: value.endDate || null,
      isActive: value.isActive,
      title: value.title?.trim() || undefined,
    };
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
