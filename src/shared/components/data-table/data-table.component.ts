import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

import type {
  TableAction,
  TableActionEvent,
  TableBadge,
  TableColumn,
  TableSort,
} from '../../models/table.model';

function resolveCellValue<T>(row: T, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, row as unknown);
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    MatIconButton,
    MatTooltip,
    MatCheckbox,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    NgTemplateOutlet,
  ],
})
export class DataTableComponent<T extends { id: string }> {
  readonly columns = input<TableColumn<T>[]>([]);
  readonly rows = input<T[]>([]);
  readonly loading = input<boolean>(false);
  readonly sort = input<TableSort | null>(null);
  readonly actions = input<TableAction<T>[]>([]);
  readonly selectable = input<boolean>(false);
  readonly selectedIds = input<readonly string[]>([]);

  readonly actionClicked = output<TableActionEvent<T>>();
  readonly sortChange = output<TableSort>();
  readonly selectionChange = output<readonly string[]>();

  /** Track function estable para columnas: usa key + header como identificador único */
  protected readonly trackColumn = (index: number, column: TableColumn<T>): string => {
    return `${String(column.key)}|${column.header}`;
  };

  cellValue(row: T, column: TableColumn<T>): string {
    if (column.cell) return String(column.cell(row));
    const value = resolveCellValue(row, String(column.key));
    return value === null || value === undefined ? '' : String(value);
  }

  cellBadge(row: T, column: TableColumn<T>): TableBadge | null {
    const badge = column.badge?.(row);
    return badge ?? null;
  }

  badgeClasses(tone: TableBadge['tone']): string {
    switch (tone) {
      case 'ok':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'low':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'out':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
      case 'info':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
    }
  }

  badgeDotClasses(tone: TableBadge['tone']): string {
    switch (tone) {
      case 'ok':
        return 'bg-emerald-500';
      case 'low':
        return 'bg-amber-500';
      case 'out':
        return 'bg-rose-500';
      case 'info':
        return 'bg-sky-500';
    }
  }

  onSort(column: TableColumn<T>): void {
    if (!column.sortable) return;
    const key = String(column.key);
    const current = this.sort();
    const direction = current?.key === key && current.direction === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ key, direction });
  }

  isSelected(row: T): boolean {
    return this.selectedIds().includes(row.id);
  }

  isAllSelected(): boolean {
    const rows = this.rows();
    return rows.length > 0 && rows.every((row) => this.selectedIds().includes(row.id));
  }

  toggleRow(row: T): void {
    const current = this.selectedIds();
    const next = current.includes(row.id)
      ? current.filter((id) => id !== row.id)
      : [...current, row.id];
    this.selectionChange.emit(next);
  }

  toggleAll(): void {
    const rows = this.rows();
    const next = this.isAllSelected() ? [] : rows.map((row) => row.id);
    this.selectionChange.emit(next);
  }

  handleAction(actionId: string, row: T): void {
    this.actionClicked.emit({ actionId, row });
  }

  isCurrentlyLoading(): boolean {
    return this.loading();
  }

  actionsOf(row: T): TableAction<T>[] {
    return this.actions().filter((action) => action.visible?.(row) ?? true);
  }

  sortIndicator(column: TableColumn<T>): 'ascending' | 'descending' | 'none' {
    const current = this.sort();
    const key = String(column.key);
    if (current?.key === key && current.direction === 'asc') return 'ascending';
    if (current?.key === key && current.direction === 'desc') return 'descending';
    return 'none';
  }

  sortIcon(column: TableColumn<T>): string {
    const current = this.sort();
    const key = String(column.key);
    if (current?.key === key) {
      return current.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
    }
    return 'unfold_more';
  }
}
