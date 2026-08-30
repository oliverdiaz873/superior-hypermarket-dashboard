import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProductSelectorComponent } from './product-selector.component';
import type { Product } from '@features/products/models/product.model';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    sku: 'SKU-001',
    name: 'Arroz 1kg',
    price: 100,
    image: '/uploads/products/p1/image.webp',
    categoryId: 'c1',
    subcategoryId: null,
    category: { name: 'Alimentos', slug: 'alimentos' },
    subcategory: null,
    brandId: 'b1',
    brand: { name: 'Marca X', slug: 'marca-x' },
    unit: 'kg',
    unitQuantity: 1,
    status: 'active',
    isAvailable: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Product;
}

describe('ProductSelectorComponent', () => {
  let fixture: ComponentFixture<ProductSelectorComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    jest.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ProductSelectorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductSelectorComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    httpMock.verify();
  });

  it('render inicial sin request y sin helper ni dropdown', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="product-selector-helper"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="product-selector-dropdown"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="product-selector-input"]')).toBeTruthy();
    expect(
      el.querySelector('[data-testid="product-selector-input"]')?.getAttribute('aria-describedby'),
    ).toBeFalsy();
    httpMock.expectNone((r) => r.url.includes('/api/admin/products') && !!r.params.get('q'));
  });

  it('click en input vacio no abre dropdown ni muestra helper', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-helper"]'),
    ).toBeFalsy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeFalsy();
  });

  it('menos de 2 caracteres no realiza request pero muestra helper para 1 letra', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-helper"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-helper"]')?.textContent,
    ).toContain('Escribe al menos 2 caracteres');
    expect(input.getAttribute('aria-describedby')).toBe('product-selector-helper');
    jest.advanceTimersByTime(400);
    httpMock.expectNone((r) => r.url.includes('/api/admin/products') && !!r.params.get('q'));
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeFalsy();
  });

  it('helper desaparece al escribir 2 caracteres y comienza busqueda', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-helper"]'),
    ).toBeTruthy();
    input.value = 'ar';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-helper"]'),
    ).toBeFalsy();
    expect(input.getAttribute('aria-describedby')).toBeFalsy();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'ar');
    req.flush({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeTruthy();
  });

  it('debounce 300 ms antes de request', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'ar';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(200);
    httpMock.expectNone((r) => r.url.includes('/api/admin/products') && !!r.params.get('q'));
    jest.advanceTimersByTime(150);
    const req = httpMock.expectOne(
      (r) => r.url.includes('/api/admin/products') && r.params.get('q') === 'ar',
    );
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('sortBy')).toBe('name');
    req.flush({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    fixture.detectChanges();
  });

  it('request correcto despues del debounce con q, limit, sort', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.url.includes('/api/admin/products'));
    expect(req.request.params.get('q')).toBe('arroz');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('sortBy')).toBe('name');
    expect(req.request.params.get('sortOrder')).toBe('asc');
    req.flush({
      success: true,
      data: [makeProduct()],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeTruthy();
  });

  it('switchMap cancela busqueda anterior', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'co';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(150);
    input.value = 'coca';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(150);
    httpMock.expectNone((r) => r.url.includes('/api/admin/products') && !!r.params.get('q'));
    jest.advanceTimersByTime(200);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'coca');
    req.flush({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    fixture.detectChanges();
    expect(httpMock.match((r) => r.params.get('q') === 'co').length).toBe(0);
  });

  it('muestra loading durante busqueda', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-loading"]'),
    ).toBeTruthy();
    req.flush({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-loading"]'),
    ).toBeFalsy();
  });

  it('muestra resultados con imagen, nombre, SKU, precio y categoria', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    req.flush({
      success: true,
      data: [makeProduct({ id: 'p1', name: 'Arroz 1kg', sku: 'SKU-001', price: 120 })],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    const option = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-option-p1"]',
    ) as HTMLElement;
    expect(option).toBeTruthy();
    expect(option.textContent).toContain('Arroz 1kg');
    expect(option.textContent).toContain('SKU-001');
    expect(option.textContent).toContain('120');
    expect(option.textContent).toContain('Alimentos');
    expect(option.querySelector('img')?.getAttribute('src')).toContain(
      '/uploads/products/p1/image.webp',
    );
  });

  it('seleccion de producto emite y muestra preview, cierra dropdown', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    const product = makeProduct();
    req.flush({
      success: true,
      data: [product],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    const spy = jest.spyOn(fixture.componentInstance.productSelected, 'emit');
    const option = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-option-p1"]',
    ) as HTMLElement;
    option.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-selected"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-selected"]')?.textContent,
    ).toContain('Arroz 1kg');
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeFalsy();
  });

  it('preview del producto seleccionado visible con cambiar y limpiar', () => {
    fixture.componentRef.setInput('selectedProduct', makeProduct());
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="product-selector-selected"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="product-selector-change"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="product-selector-clear"]')).toBeTruthy();
  });

  it('clear limpia seleccion y emite null', () => {
    fixture.componentRef.setInput('selectedProduct', makeProduct());
    fixture.detectChanges();
    const spy = jest.spyOn(fixture.componentInstance.productSelected, 'emit');
    const clearBtn = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-clear"]',
    ) as HTMLElement;
    clearBtn.click();
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(null);
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-input"]'),
    ).toBeTruthy();
  });

  it('empty state sin resultados', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'zzzz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'zzzz');
    req.flush({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-empty"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Sin resultados para');
  });

  it('error y boton Reintentar', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    req.flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-error"]'),
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No se pudo completar');
    const retryBtn = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-retry"]',
    ) as HTMLElement;
    retryBtn.click();
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const retryReq = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    retryReq.flush({
      success: true,
      data: [makeProduct()],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-option-p1"]'),
    ).toBeTruthy();
  });

  it('keyboard navigation ArrowDown, ArrowUp, Enter', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    req.flush({
      success: true,
      data: [makeProduct({ id: 'p1', name: 'Arroz' }), makeProduct({ id: 'p2', name: 'Azucar' })],
      pagination: { page: 1, limit: 20, total: 2, pages: 1 },
    });
    fixture.detectChanges();
    const spy = jest.spyOn(fixture.componentInstance.productSelected, 'emit');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(spy).toHaveBeenCalled();
  });

  it('Escape cierra dropdown', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    req.flush({
      success: true,
      data: [makeProduct()],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeTruthy();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeFalsy();
  });

  it('disabled no permite busqueda', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    // intentar input debe ser ignorado por componente
    const event = new Event('input', { bubbles: true });
    Object.defineProperty(event, 'target', { value: { value: 'arroz' }, writable: false });
    input.dispatchEvent(event);
    fixture.detectChanges();
    jest.advanceTimersByTime(400);
    httpMock.expectNone((r) => r.url.includes('/api/admin/products') && !!r.params.get('q'));
  });

  it('click outside cierra dropdown', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    req.flush({
      success: true,
      data: [makeProduct()],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeTruthy();
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-dropdown"]'),
    ).toBeFalsy();
  });

  it('accesibilidad basica: combobox, aria-expanded, aria-controls, listbox, aria-selected', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBeTruthy();
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    req.flush({
      success: true,
      data: [makeProduct()],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();
    const option = fixture.nativeElement.querySelector('[role="option"]');
    expect(option).toBeTruthy();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(option.getAttribute('aria-selected')).toBeTruthy();
  });

  it('producto previamente seleccionado/hydration via selectedProduct', () => {
    const product = makeProduct({ id: 'p99', name: 'Hydrated' });
    fixture.componentRef.setInput('selectedProduct', product);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-selected"]')?.textContent,
    ).toContain('Hydrated');
  });

  it('hydration via selectedProductId hace GET by id', () => {
    fixture.componentRef.setInput('selectedProductId', 'p99');
    fixture.componentRef.setInput('selectedProduct', null);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url.includes('/api/admin/products/p99'));
    req.flush({ success: true, data: makeProduct({ id: 'p99', name: 'Fetched' }) });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-selected"]')?.textContent,
    ).toContain('Fetched');
  });

  it('renderiza imagen relativa /uploads/... permanece relativa', () => {
    const product = makeProduct({ image: '/uploads/products/p1/image.webp' } as unknown as Product);
    fixture.componentRef.setInput('selectedProduct', product);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-selected"] img',
    ) as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/uploads/products/p1/image.webp');
    expect(img.getAttribute('src')).not.toContain('/uploads/uploads/');
    expect(img.getAttribute('src')).not.toContain('http://localhost:4200');
    expect(img.getAttribute('src')).not.toContain('http://localhost:3000');
  });

  it('conserva URL absoluta https://cdn... sin modificar', () => {
    const product = makeProduct({
      image: 'https://cdn.example.com/products/p1.webp',
    } as unknown as Product);
    fixture.componentRef.setInput('selectedProduct', product);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-selected"] img',
    ) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/products/p1.webp');
  });

  it('image null muestra placeholder y no img', () => {
    const product = makeProduct({ image: null as unknown as string } as unknown as Product);
    fixture.componentRef.setInput('selectedProduct', product);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="product-selector-selected"] img'),
    ).toBeFalsy();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="product-selector-selected"] .product-selector__thumb--placeholder',
      ),
    ).toBeTruthy();
  });

  it('muestra imagen relativa en resultados del dropdown resuelta correctamente', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-input"]',
    ) as HTMLInputElement;
    input.value = 'arroz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    jest.advanceTimersByTime(350);
    const req = httpMock.expectOne((r) => r.params.get('q') === 'arroz');
    req.flush({
      success: true,
      data: [
        makeProduct({ id: 'p1', image: '/uploads/products/p1/image.webp' } as unknown as Product),
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector(
      '[data-testid="product-selector-option-p1"] img',
    ) as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/uploads/products/p1/image.webp');
  });
});
