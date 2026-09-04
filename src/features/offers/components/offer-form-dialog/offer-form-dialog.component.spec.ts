import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { OfferFormDialogComponent, type OfferFormDialogData } from './offer-form-dialog.component';
import { OffersStore } from '../../state/offers.store';
import type { Offer } from '../../models/offer.model';

const offer: Offer = {
  id: 'o1',
  productId: 'p1',
  productName: 'Arroz 1kg',
  originalPrice: 100,
  discountPrice: 80,
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  isActive: true,
  title: 'Oferta arroz',
};

describe('OfferFormDialogComponent (crear)', () => {
  let fixture: ComponentFixture<OfferFormDialogComponent>;
  let component: OfferFormDialogComponent;
  let store: InstanceType<typeof OffersStore>;
  let httpMock: HttpTestingController;
  const dialogRef = { close: jest.fn() };

  beforeEach(async () => {
    dialogRef.close.mockClear();
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, OfferFormDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} as OfferFormDialogData },
      ],
    }).compileComponents();
    store = TestBed.inject(OffersStore);
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OfferFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('muestra el título "Nueva oferta"', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nueva oferta');
  });

  it('no rellena el formulario en modo creación', () => {
    expect(component.form.getRawValue().productId).toBe('');
    expect(component.form.getRawValue().isActive).toBe(true);
  });

  it('discountPercentage calcula el porcentaje', () => {
    component.form.patchValue({ originalPrice: 100, discountPrice: 80 });
    expect(component['discountPercentage']()).toBe(20);
  });

  it('marca dateRangeInvalid cuando el fin es anterior al inicio', () => {
    component.form.patchValue({ startDate: '2026-06-01T10:00', endDate: '2026-01-01T10:00' });
    expect(component.form.errors?.['dateRangeInvalid']).toBe(true);
  });

  it('productSelected establece productId y selectedProduct', () => {
    const product = {
      id: 'p2',
      sku: 'SKU-002',
      name: 'Azucar 1kg',
      price: 50,
      image: 'http://localhost:3000/uploads/products/p2/image.webp',
      categoryId: 'c1',
      category: { name: 'Alimentos', slug: 'alimentos' },
      status: 'active',
      isAvailable: true,
    } as unknown as import('@features/products/models/product.model').Product;
    component['onProductSelected'](product);
    expect(component.form.getRawValue().productId).toBe('p2');
    expect(component['selectedProduct']()).toEqual(expect.objectContaining({ id: 'p2' }));
  });

  it('productSelected con null limpia productId', () => {
    component.form.patchValue({ productId: 'p1' });
    component['selectedProduct'].set({
      id: 'p1',
    } as unknown as import('@features/products/models/product.model').Product);
    component['onProductSelected'](null);
    expect(component.form.getRawValue().productId).toBe('');
    expect(component['selectedProduct']()).toBeNull();
  });

  it('no envía ni cierra cuando el descuento no es menor al original', async () => {
    const spy = jest.spyOn(store, 'create');
    component.form.setValue({
      productId: 'p1',
      originalPrice: 100,
      discountPrice: 100,
      startDate: '2026-01-01T10:00',
      endDate: '',
      title: '',
      isActive: true,
    });

    await component['onSubmit']();

    expect(spy).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });

  it('valida required productId', async () => {
    const spy = jest.spyOn(store, 'create');
    component.form.setValue({
      productId: '',
      originalPrice: 100,
      discountPrice: 80,
      startDate: '2026-01-01T10:00',
      endDate: '',
      title: '',
      isActive: true,
    });
    await component['onSubmit']();
    expect(spy).not.toHaveBeenCalled();
    expect(component.form.controls.productId.invalid).toBe(true);
  });

  it('envía el payload de creación y cierra con el resultado', async () => {
    const spy = jest.spyOn(store, 'create').mockResolvedValue(offer);
    component.form.setValue({
      productId: 'p1',
      originalPrice: 100,
      discountPrice: 80,
      startDate: '2026-01-01T10:00',
      endDate: '',
      title: '',
      isActive: true,
    });

    await component['onSubmit']();

    expect(spy).toHaveBeenCalledWith({
      productId: 'p1',
      originalPrice: 100,
      discountPrice: 80,
      startDate: '2026-01-01T10:00',
      endDate: null,
      isActive: true,
      title: undefined,
    });
    expect(dialogRef.close).toHaveBeenCalledWith(offer);
  });

  it('no hace la antigua carga de 100 productos', () => {
    httpMock.expectNone(
      (r) => r.url.includes('/api/admin/products') && r.params.get('limit') === '100',
    );
  });
});

describe('OfferFormDialogComponent (editar)', () => {
  let fixture: ComponentFixture<OfferFormDialogComponent>;
  let component: OfferFormDialogComponent;
  let httpMock: HttpTestingController;
  const dialogRef = { close: jest.fn() };

  beforeEach(async () => {
    dialogRef.close.mockClear();
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, OfferFormDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { offer } as OfferFormDialogData },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OfferFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.includes('/api/admin/products/p1'));
    req.flush({
      success: true,
      data: {
        id: 'p1',
        name: 'Arroz 1kg',
        sku: 'SKU-001',
        price: 100,
        image: 'http://localhost:3000/uploads/products/p1/image.webp',
        category: { name: 'Alimentos', slug: 'alimentos' },
        status: 'active',
        isAvailable: true,
      },
    });
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('muestra el título "Editar oferta"', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Editar oferta');
  });

  it('prellena el formulario con la oferta existente', () => {
    const value = component.form.getRawValue();
    expect(value.productId).toBe('p1');
    expect(value.originalPrice).toBe(100);
    expect(value.discountPrice).toBe(80);
    expect(value.title).toBe('Oferta arroz');
    expect(value.isActive).toBe(true);
    expect(component.form.errors?.['discountNotLess']).toBeFalsy();
  });

  it('delega hidratación al ProductSelector y mantiene productId', () => {
    expect(component.form.getRawValue().productId).toBe('p1');
    expect(component['selectedProduct']()).toBeNull();
  });

  it('envía el payload de actualización con el id de la oferta', async () => {
    const store = TestBed.inject(OffersStore);
    const spy = jest.spyOn(store, 'update').mockResolvedValue(offer);
    component.form.patchValue({ originalPrice: 90, discountPrice: 70 });

    await component['onSubmit']();

    expect(spy).toHaveBeenCalledWith('o1', {
      productId: 'p1',
      originalPrice: 90,
      discountPrice: 70,
      startDate: expect.any(String),
      endDate: expect.any(String),
      isActive: true,
      title: 'Oferta arroz',
    });
    expect(dialogRef.close).toHaveBeenCalledWith(offer);
  });
});
