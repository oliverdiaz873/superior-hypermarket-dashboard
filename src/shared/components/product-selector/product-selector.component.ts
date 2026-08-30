import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  Subject,
  switchMap,
  catchError,
  of,
  tap,
} from 'rxjs';

import { ClickOutsideDirective } from '@shared/directives/click-outside/click-outside.directive';

import { ProductsService } from '@features/products/services/products.service';
import type { Product } from '@features/products/models/product.model';
import { resolveDashboardImageUrl } from '@features/products/utils/product-image.util';

/**
 * ProductSelectorComponent
 *
 * Reusable product picker for large catalogs.
 * Replaces static <select> lists with a server-side searchable combobox.
 *
 * Responsibilities:
 * - Single responsibility: select a `Product` via server-side search. No
 *   knowledge of `Offer`, `OffersStore`, or discount business logic.
 * - Search UX: 300ms debounce with distinctUntilChanged, minimum 2 characters,
 *   switchMap cancellation, and takeUntilDestroyed → GET /api/admin/products
 *   with a limited result set.
 * - Results: compact dropdown with product image, name, SKU, price, and
 *   additional product metadata when available; handles loading, empty,
 *   error/retry, and initial hint states.
 * - Selection: `productSelected: output<Product|null>` with selected-product
 *   preview and Change/Clear actions.
 * - Keyboard interaction: ArrowDown/ArrowUp navigation, Enter selection,
 *   Escape to close, and click-outside handling.
 * - Hydration: supports `selectedProductId` and `selectedProduct`; when only
 *   an ID is provided, the component fetches the product for edit scenarios.
 * - Accessibility: combobox/listbox semantics with ARIA attributes and
 *   keyboard navigation.
 *
 * Location:
 * `src/shared/components/product-selector/` - canonical location for reusable
 * UI components, alongside `search-input`, `filter-select`, `pagination`,
 * `global-search`, and `data-table`.
 *
 * Reusability:
 * The component contains no offer-specific business logic and communicates
 * through generic product-selection inputs/outputs, allowing it to be reused
 * by other features such as inventory, orders, or bundles.
 *
 * Data:
 * Product data and HTTP access are reused from the existing products domain
 * (`Product` and `ProductsService`) to avoid duplicating product API logic.
 *
 * Visual:
 * Ecommerce-style searchable combobox with a compact scrollable result list.
 * Product images use the API-provided public `product.image` URL directly;
 * static asset resolution is intentionally not used for product images.
 *
 * @example
 * ```html
 * <app-product-selector
 *   [selectedProductId]="form.controls.productId.value"
 *   [selectedProduct]="selectedProduct()"
 *   [placeholder]="'Search by name or SKU.'"
 *   [limit]="20"
 *   [disabled]="submitting()"
 *   (productSelected)="onProductSelected($event)"
 * />
 * ```
 */

@Component({
  selector: 'app-product-selector',
  templateUrl: './product-selector.component.html',
  styleUrl: './product-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, ClickOutsideDirective],
})
export class ProductSelectorComponent {
  readonly selectedProductId = input<string | null>(null);
  readonly selectedProduct = input<Product | null>(null);
  readonly placeholder = input<string>('Buscar por nombre o SKU…');
  readonly limit = input<number>(20);
  readonly disabled = input<boolean>(false);

  readonly productSelected = output<Product | null>();
  readonly searchError = output<string>();

  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchText = signal('');
  protected readonly results = signal<Product[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly searchErrorMessage = signal<string | null>(null);
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly selected = signal<Product | null>(null);
  protected readonly hasSearched = signal(false);

  private readonly searchSubject = new Subject<string>();

  protected readonly showDropdown = computed(
    () =>
      this.isOpen() &&
      !this.disabled() &&
      !this.selected() &&
      (this.hasSearched() ||
        this.isSearching() ||
        !!this.searchErrorMessage() ||
        this.results().length > 0),
  );
  protected readonly showHelper = computed(
    () =>
      !this.hasSearched() &&
      this.searchText().trim().length === 1 &&
      !this.isSearching() &&
      !this.searchErrorMessage(),
  );
  protected readonly showHint = computed(
    () => !this.hasSearched() && !this.isSearching() && !this.searchErrorMessage(),
  );
  protected readonly isEmptyResults = computed(
    () =>
      this.hasSearched() &&
      this.results().length === 0 &&
      !this.isSearching() &&
      !this.searchErrorMessage(),
  );

  protected readonly listboxId =
    'product-selector-listbox-' + Math.random().toString(36).slice(2, 8);
  protected readonly inputId = 'product-selector-input-' + Math.random().toString(36).slice(2, 8);

  constructor() {
    effect(() => {
      const inputProduct = this.selectedProduct();
      if (inputProduct) {
        this.selected.set(inputProduct);
        return;
      }
      const id = this.selectedProductId();
      if (!id) {
        this.selected.set(null);
        return;
      }
      const current = this.selected();
      if (current?.id === id) return;
      this.fetchProductById(id);
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((term) => {
          const trimmed = term.trim();
          if (trimmed.length === 0) {
            this.results.set([]);
            this.hasSearched.set(false);
            this.isSearching.set(false);
            this.searchErrorMessage.set(null);
            this.activeIndex.set(-1);
            return false;
          }
          if (trimmed.length < 2) {
            this.results.set([]);
            this.hasSearched.set(false);
            this.isSearching.set(false);
            this.searchErrorMessage.set(null);
            this.activeIndex.set(-1);
            return false;
          }
          return true;
        }),
        tap(() => {
          this.isSearching.set(true);
          this.searchErrorMessage.set(null);
          this.hasSearched.set(true);
          this.isOpen.set(true);
          this.activeIndex.set(-1);
        }),
        switchMap((term) => {
          const q = term.trim();
          const limit = this.limit();
          return this.productsService
            .list(
              {
                page: 1,
                limit: Math.min(20, Math.max(1, limit)),
                q,
                sortBy: 'name',
                sortOrder: 'asc',
              } as unknown as Parameters<ProductsService['list']>[0],
              { skipLoading: true },
            )
            .pipe(
              catchError(() => {
                const msg = 'No se pudo completar la búsqueda.';
                this.searchErrorMessage.set(msg);
                this.searchError.emit(msg);
                this.isSearching.set(false);
                this.results.set([]);
                return of(null);
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        if (page === null) return;
        this.results.set((page.data as Product[]) ?? []);
        this.isSearching.set(false);
      });
  }

  protected onInput(event: Event): void {
    if (this.disabled()) return;
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    const len = value.trim().length;
    if (!len) {
      this.isOpen.set(false);
    } else if (len >= 2) {
      this.isOpen.set(true);
    } else {
      this.isOpen.set(false);
    }
    this.searchSubject.next(value);
  }

  protected onFocus(): void {
    if (this.disabled() || this.selected()) return;
    if (this.searchText().trim().length >= 2) {
      this.isOpen.set(true);
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (!this.showDropdown()) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Enter':
        event.preventDefault();
        this.selectActive();
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
    }
  }

  protected selectProduct(product: Product): void {
    this.selected.set(product);
    this.searchText.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.searchErrorMessage.set(null);
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.productSelected.emit(product);
  }

  protected clearSelection(): void {
    this.selected.set(null);
    this.searchText.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.searchErrorMessage.set(null);
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.productSelected.emit(null);
  }

  protected changeSelection(): void {
    this.selected.set(null);
    this.searchText.set('');
    this.results.set([]);
    this.hasSearched.set(false);
    this.searchErrorMessage.set(null);
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.productSelected.emit(null);
  }

  protected retry(): void {
    const term = this.searchText().trim();
    if (term.length < 2) return;
    this.isSearching.set(true);
    this.searchErrorMessage.set(null);
    this.isOpen.set(true);
    const limit = this.limit();
    this.productsService
      .list(
        {
          page: 1,
          limit: Math.min(20, Math.max(1, limit)),
          q: term,
          sortBy: 'name',
          sortOrder: 'asc',
        } as unknown as Parameters<ProductsService['list']>[0],
        { skipLoading: true },
      )
      .subscribe({
        next: (page) => {
          this.results.set((page.data as Product[]) ?? []);
          this.isSearching.set(false);
          this.hasSearched.set(true);
        },
        error: () => {
          const msg = 'No se pudo completar la búsqueda.';
          this.searchErrorMessage.set(msg);
          this.searchError.emit(msg);
          this.isSearching.set(false);
          this.results.set([]);
        },
      });
  }

  protected closeDropdown(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  protected onClickOutside(): void {
    this.closeDropdown();
  }

  protected resolveImage(image: string | null | undefined): string | null {
    return resolveDashboardImageUrl(image);
  }

  protected activeDescendantId(): string {
    const index = this.activeIndex();
    return index >= 0 ? this.listboxId + '-option-' + index : '';
  }

  private moveActive(delta: number): void {
    const items = this.results();
    if (items.length === 0) return;
    const current = this.activeIndex();
    let next = current + delta;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    this.activeIndex.set(next);
  }

  private selectActive(): void {
    const index = this.activeIndex();
    const items = this.results();
    if (index >= 0 && index < items.length) {
      this.selectProduct(items[index]);
    }
  }

  private fetchProductById(id: string): void {
    this.productsService.getById(id).subscribe({
      next: (product) => this.selected.set(product),
      error: () => this.selected.set(null),
    });
  }
}
