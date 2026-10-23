/**
 * Transport-order list read model for the logistics view (PIC-10.4,
 * REF-12.4). Orders are authoritative entities; this model only projects them.
 *
 * Source: PIC-10.4, REF-12.4
 */
import type { TransportOrder } from '@aesfw/core';
import type { TransportOrderDto } from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';
import { stationDtos } from './transport-detail.js';

/**
 * Lists every transport order in ascending entity id order.
 *
 * Source: PIC-10.4
 */
export function transportOrders(session: SessionState): readonly TransportOrderDto[] {
  const store = session.world.stores.get<TransportOrder>('transportOrder');
  return store.ids().map((order) => {
    const component = store.get(order);
    if (component === undefined) {
      return { order_id: order, mode: 'route', stations: [], repeat: true };
    }
    return {
      order_id: order,
      mode: component.mode,
      stations: stationDtos(session.content.registry, component),
      repeat: component.repeat,
    };
  });
}
