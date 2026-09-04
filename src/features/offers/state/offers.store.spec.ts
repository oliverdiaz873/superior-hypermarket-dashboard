import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { OffersStore } from './offers.store';
import { NotificationsStore } from '@core/state/notifications/notifications.store';
import type { Offer } from '../models/offer.model';

const LIST_URL = 'http://localhost:3000/api/admin/offers';
const OFFERS_URL = 'http://localhost:3000/api/offers';

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'o1',
    productId: 'p1',
    productName: 'Arroz 1kg',
    originalPrice: 100,
    discountPrice: 80,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    isActive: true,
    ...overrides,
  };
}

describe('OffersStore', () => {
  let store: InstanceType<typeof OffersStore>;
  let notifications: NotificationsStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(OffersStore);
    notifications = TestBed.inject(NotificationsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('load consume GET /api/admin/offers y rellena el estado', async () => {
    const pending = store.load();
    httpMock.expectOne(LIST_URL).flush({ success: true, data: [makeOffer()] });
    await pending;

    expect(store.hasLoaded()).toBe(true);
    expect(store.isLoading()).toBe(false);
    expect(store.items().length).toBe(1);
    expect(store.isEmpty()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('load ante fallo marca hasLoaded y expone el error', async () => {
    const pending = store.load();
    httpMock.expectOne(LIST_URL).error(new ErrorEvent('boom'), { status: 500 });
    await pending;

    expect(store.hasLoaded()).toBe(true);
    expect(store.error()).toBe('No se pudieron cargar las ofertas.');
    expect(store.isLoading()).toBe(false);
  });

  it('setActiveFilter filtra en memoria por estado', async () => {
    const pending = store.load();
    httpMock
      .expectOne(LIST_URL)
      .flush({ success: true, data: [makeOffer(), makeOffer({ id: 'o2', isActive: false })] });
    await pending;

    store.setActiveFilter('inactive');
    expect(store.filteredItems().map((o) => o.id)).toEqual(['o2']);

    store.setActiveFilter('active');
    expect(store.filteredItems().map((o) => o.id)).toEqual(['o1']);

    store.setActiveFilter('all');
    expect(store.filteredItems().length).toBe(2);
  });

  it('create hace POST y recarga el listado para resolver productName', async () => {
    const pendingLoad = store.load();
    httpMock.expectOne(LIST_URL).flush({ success: true, data: [] });
    await pendingLoad;

    const pending = store.create({
      productId: 'p1',
      originalPrice: 100,
      discountPrice: 80,
      startDate: '2026-01-01T00:00',
    });
    const req = httpMock.expectOne(OFFERS_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: makeOffer() });
    await Promise.resolve();
    httpMock.expectOne(LIST_URL).flush({ success: true, data: [makeOffer()] });

    const result = await pending;
    expect(result?.id).toBe('o1');
    expect(store.items().length).toBe(1);
    expect(notifications.notifications().length).toBe(1);
  });

  it('toggleActive hace PATCH isActive invertido y recarga', async () => {
    const pendingLoad = store.load();
    httpMock.expectOne(LIST_URL).flush({ success: true, data: [makeOffer()] });
    await pendingLoad;

    const pending = store.toggleActive(makeOffer());
    const req = httpMock.expectOne(`${OFFERS_URL}/o1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false });
    req.flush({ success: true, data: makeOffer({ isActive: false }) });
    await Promise.resolve();
    httpMock.expectOne(LIST_URL).flush({ success: true, data: [makeOffer({ isActive: false })] });

    await pending;
    expect(store.items()[0].isActive).toBe(false);
    expect(notifications.notifications().length).toBe(2);
  });

  it('remove consume DELETE 204 y elimina la oferta del listado', async () => {
    const pendingLoad = store.load();
    httpMock.expectOne(LIST_URL).flush({ success: true, data: [makeOffer()] });
    await pendingLoad;

    const pending = store.remove('o1');
    const req = httpMock.expectOne(`${OFFERS_URL}/o1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await pending;
    expect(store.items()).toEqual([]);
    expect(store.isEmpty()).toBe(true);
    expect(notifications.notifications().length).toBe(1);
  });
});
