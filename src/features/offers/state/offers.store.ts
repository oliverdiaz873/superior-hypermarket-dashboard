import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { NOTIFICATION_TYPE } from '@core/enums/notification-type';
import { NotificationsStore } from '@core/state/notifications/notifications.store';

import { OffersService } from '../services/offers.service';
import type { CreateOfferPayload, Offer, UpdateOfferPayload } from '../models/offer.model';
import type { OfferActiveFilter } from '../constants/offer.constants';

interface OffersState {
  items: Offer[];
  activeFilter: OfferActiveFilter;
  isLoading: boolean;
  hasLoaded: boolean;
  isMutating: boolean;
  error: string | null;
}

export const OffersStore = signalStore(
  { providedIn: 'root' },
  withState<OffersState>(() => ({
    items: [],
    activeFilter: 'all',
    isLoading: false,
    hasLoaded: false,
    isMutating: false,
    error: null,
  })),
  withComputed(({ items, activeFilter }) => ({
    isEmpty: computed(() => items().length === 0),
    filteredItems: computed(() => {
      const filter = activeFilter();
      if (filter === 'all') return items();
      return items().filter((offer) => (filter === 'active' ? offer.isActive : !offer.isActive));
    }),
    activeCount: computed(() => items().filter((offer) => offer.isActive).length),
  })),
  withMethods((store) => {
    const offersService = inject(OffersService);
    const notificationsStore = inject(NotificationsStore);

    const load = async (): Promise<void> => {
      if (store.isLoading()) return;
      patchState(store, { isLoading: true, error: null });
      try {
        const items = await firstValueFrom(offersService.list());
        patchState(store, { items, hasLoaded: true });
      } catch {
        patchState(store, {
          error: 'No se pudieron cargar las ofertas.',
          hasLoaded: true,
        });
      } finally {
        patchState(store, { isLoading: false });
      }
    };

    const update = async (id: string, payload: UpdateOfferPayload): Promise<Offer | null> => {
      patchState(store, { isMutating: true });
      try {
        const updated = await firstValueFrom(offersService.update(id, payload));
        await load();
        notificationsStore.add({
          type: NOTIFICATION_TYPE.SUCCESS,
          title: 'Oferta actualizada',
          message: 'Los cambios de la oferta se guardaron correctamente.',
        });
        return updated;
      } catch {
        return null;
      } finally {
        patchState(store, { isMutating: false });
      }
    };

    return {
      load,
      refresh(): void {
        void load();
      },

      setActiveFilter(filter: OfferActiveFilter): void {
        patchState(store, { activeFilter: filter });
      },

      async create(payload: CreateOfferPayload): Promise<Offer | null> {
        patchState(store, { isMutating: true });
        try {
          const created = await firstValueFrom(offersService.create(payload));
          await load();
          notificationsStore.add({
            type: NOTIFICATION_TYPE.SUCCESS,
            title: 'Oferta creada',
            message: `La oferta del producto fue creada correctamente.`,
          });
          return created;
        } catch {
          return null;
        } finally {
          patchState(store, { isMutating: false });
        }
      },

      update,

      async toggleActive(offer: Offer): Promise<void> {
        const next = !offer.isActive;
        const updated = await update(offer.id, { isActive: next });
        if (updated) {
          notificationsStore.add({
            type: NOTIFICATION_TYPE.SUCCESS,
            title: next ? 'Oferta activada' : 'Oferta desactivada',
            message: `La oferta del producto quedó ${next ? 'activa' : 'inactiva'}.`,
          });
        }
      },

      async remove(id: string): Promise<void> {
        patchState(store, { isMutating: true });
        try {
          await firstValueFrom(offersService.remove(id));
          patchState(store, {
            items: store.items().filter((offer) => offer.id !== id),
          });
          notificationsStore.add({
            type: NOTIFICATION_TYPE.SUCCESS,
            title: 'Oferta eliminada',
            message: 'La oferta se eliminó correctamente.',
          });
        } catch {
          // El error de mutación ya se notifica vía el ErrorInterceptor.
        } finally {
          patchState(store, { isMutating: false });
        }
      },
    };
  }),
);
