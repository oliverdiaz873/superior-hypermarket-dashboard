import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, ViewChild } from '@angular/core';
import type { OnInit, TemplateRef } from '@angular/core';

import { DataTableComponent } from './data-table.component';
import type { TableAction, TableColumn } from '../../models/table.model';

interface Row {
  id: string;
  name: string;
  price: number;
}

describe('DataTableComponent', () => {
  const columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'price', header: 'Precio', align: 'right', cell: (r) => `$${r.price}` },
  ];
  const rows: Row[] = [
    { id: '1', name: 'Arroz', price: 80 },
    { id: '2', name: 'Fideo', price: 40 },
  ];

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [DataTableComponent, NoopAnimationsModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(DataTableComponent);
    const comp = fixture.componentInstance;
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('actions', []);
    fixture.detectChanges();
    return { fixture, comp };
  }

  it('emite sortChange con la dirección correcta al ordenar una columna', async () => {
    const { fixture, comp } = await setup();
    let sort: { key: string; direction: string } | undefined;
    comp.sortChange.subscribe((s) => (sort = s));

    const sortable = columns[0];

    comp.onSort(sortable);
    expect(sort).toEqual({ key: 'name', direction: 'asc' });

    // La tabla es "tonta": el padre refleja el nuevo estado vía input antes de volver a ordenar.
    fixture.componentRef.setInput('sort', { key: 'name', direction: 'asc' });
    fixture.detectChanges();
    comp.onSort(sortable);
    expect(sort).toEqual({ key: 'name', direction: 'desc' });
  });

  it('emite actionClicked con actionId y fila (no ejecuta lógica)', async () => {
    const { comp } = await setup();
    let emitted: { actionId: string; row: Row } | undefined;
    comp.actionClicked.subscribe((e) => (emitted = e));

    const action: TableAction<Row> = { id: 'delete', label: 'Eliminar', icon: 'delete' };
    comp.handleAction(action.id, rows[0]);

    expect(emitted).toEqual({ actionId: 'delete', row: rows[0] });
  });

  it('emite selectionChange al alternar una fila', async () => {
    const { fixture, comp } = await setup();
    fixture.componentRef.setInput('selectable', true);
    fixture.componentRef.setInput('selectedIds', []);
    fixture.detectChanges();

    let ids: readonly string[] = [];
    comp.selectionChange.subscribe((s) => (ids = s));

    comp.toggleRow(rows[0]);
    expect([...ids]).toEqual(['1']);

    comp.toggleAll();
    expect([...ids]).toEqual(['1', '2']);
  });

  it('aplica formato de columna a las celdas', async () => {
    const { comp } = await setup();
    const cell = comp.cellValue(rows[1], columns[1]);
    expect(cell).toBe('$40');
  });

  it('devuelve el badge de la celda y null cuando no hay badge', async () => {
    const { fixture, comp } = await setup();
    const badgeColumn: TableColumn<Row> = {
      key: 'name',
      header: 'Estado',
      badge: (r) => (r.name === 'Arroz' ? { label: 'En stock', tone: 'ok' } : null),
    };

    fixture.componentRef.setInput('columns', [badgeColumn]);
    fixture.detectChanges();

    expect(comp.cellBadge(rows[0], badgeColumn)).toEqual({ label: 'En stock', tone: 'ok' });
    expect(comp.cellBadge(rows[1], badgeColumn)).toBeNull();
    expect(comp.badgeClasses('ok')).toContain('emerald');
  });

  it('aplica clases responsive hideOnMobile coherentes entre th y td', async () => {
    const { fixture } = await setup();
    const responsiveColumns: TableColumn<Row>[] = [
      { key: 'name', header: 'Oculta', hideOnMobile: true },
      { key: 'price', header: 'Visible' },
    ];
    fixture.componentRef.setInput('columns', responsiveColumns);
    fixture.detectChanges();

    const ths = (fixture.nativeElement as HTMLElement).querySelectorAll('thead th');
    expect(ths.length).toBe(2);
    expect(ths[0].classList.contains('hidden')).toBe(true);
    expect(ths[0].className).toContain('sm:table-cell');
    expect(ths[1].classList.contains('hidden')).toBe(false);
    expect(ths[1].className).not.toContain('sm:table-cell');

    const firstRowTds = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'tbody tr:first-child td',
    );
    expect(firstRowTds.length).toBe(2);
    expect(firstRowTds[0].classList.contains('hidden')).toBe(true);
    expect(firstRowTds[0].className).toContain('sm:table-cell');
    expect(firstRowTds[1].classList.contains('hidden')).toBe(false);
    expect(firstRowTds[1].className).not.toContain('sm:table-cell');
  });
});

@Component({
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <app-data-table [columns]="columns" [rows]="rows">
      <ng-template #avatarCell let-row>
        <span class="tpl-cell">{{ row.name }} · {{ row.price }}</span>
      </ng-template>
    </app-data-table>
  `,
})
class CellTemplateHostComponent implements OnInit {
  @ViewChild('avatarCell', { static: true }) avatarCell?: TemplateRef<{ $implicit: Row }>;

  columns: TableColumn<Row>[] = [];
  rows: Row[] = [{ id: '1', name: 'Arroz', price: 80 }];

  ngOnInit(): void {
    this.columns = [{ key: 'name', header: 'Cliente', cellTemplate: this.avatarCell }];
  }
}

describe('DataTableComponent cellTemplate', () => {
  async function setupHost() {
    await TestBed.configureTestingModule({
      imports: [CellTemplateHostComponent, NoopAnimationsModule],
    }).compileComponents();
    const fixture = TestBed.createComponent(CellTemplateHostComponent);
    fixture.detectChanges();
    return { fixture };
  }

  it('renderiza el template de celda con la fila como contexto', async () => {
    const { fixture } = await setupHost();
    const tpl = (fixture.nativeElement as HTMLElement).querySelector('.tpl-cell');
    expect(tpl?.textContent).toBe('Arroz · 80');
  });

  it('el template prevalece sobre el formateador y el valor crudo', async () => {
    const { fixture } = await setupHost();
    const cell = (fixture.nativeElement as HTMLElement).querySelector('.tpl-cell');
    expect(cell?.textContent).toContain('Arroz');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('$80');
  });
});
