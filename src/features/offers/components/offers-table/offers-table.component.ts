import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import type {
  TableAction,
  TableActionEvent,
  TableBadgeTone,
  TableColumn,
} from '@shared/models/table.model';

import type { Offer } from '../../models/offer.model';
import { formatPrice, getOfferDiscountPercentage } from '../../constants/offer.constants';

const dateRange = (row: Offer): string => {
  const start = new Date(row.startDate).toLocaleDateString();
  const end = row.endDate ? new Date(row.endDate).toLocaleDateString() : 'sin fin';
  return `${start} → ${end}`;
};

const ACTIVE_TONE: Record<'active' | 'inactive', TableBadgeTone> = {
  active: 'ok',
  inactive: 'low',
};

@Component({
  selector: 'app-offers-table',
  templateUrl: './offers-table.component.html',
  styleUrl: './offers-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, MatIcon],
})
export class OffersTableComponent {
  readonly items = input<Offer[]>([]);
  readonly loading = input<boolean>(false);

  readonly actionClicked = output<TableActionEvent<Offer>>();

  protected readonly columns: TableColumn<Offer>[] = [
    {
      key: 'title',
      header: 'Título',
      cell: (row) => row.title ?? '—',
      hideOnMobile: true,
    },
    {
      key: 'productName',
      header: 'Producto',
      cell: (row) => row.productName,
    },
    {
      key: 'originalPrice',
      header: 'Precio original',
      cell: (row) => formatPrice(row.originalPrice),
      hideOnMobile: true,
    },
    {
      key: 'discountPrice',
      header: 'Precio oferta',
      cell: (row) => formatPrice(row.discountPrice),
    },
    {
      key: 'discountPercentage',
      header: 'Descuento',
      cell: (row) => `${getOfferDiscountPercentage(row)}%`,
      hideOnMobile: true,
    },
    {
      key: 'startDate',
      header: 'Vigencia',
      cell: dateRange,
      hideOnMobile: true,
    },
    {
      key: 'isActive',
      header: 'Estado',
      badge: (row) => ({
        label: row.isActive ? 'Activa' : 'Inactiva',
        tone: ACTIVE_TONE[row.isActive ? 'active' : 'inactive'],
      }),
    },
  ];

  protected readonly actions: TableAction<Offer>[] = [
    { id: 'edit', label: 'Editar', icon: 'edit' },
    {
      id: 'toggle',
      label: 'Desactivar',
      icon: 'toggle_off',
      visible: (row) => row.isActive,
    },
    {
      id: 'toggle',
      label: 'Activar',
      icon: 'toggle_on',
      visible: (row) => !row.isActive,
    },
    { id: 'delete', label: 'Eliminar', icon: 'delete' },
  ];

  protected readonly emptyTitle = 'Sin ofertas';
  protected readonly emptyMessage = 'No hay ofertas que coincidan con el filtro actual.';

  onAction(event: TableActionEvent<Offer>): void {
    this.actionClicked.emit(event);
  }
}
