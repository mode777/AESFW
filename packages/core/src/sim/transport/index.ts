/**
 * `sim/transport` — transport units, cargo compartments, movement, handling,
 * and route planning (GDD-15.4, ARCH-14).
 *
 * Source: GDD-9.8, GDD-15.4, ARCH-14
 */
export {
  cargoAccepts,
  cargoFreeCapacity,
  cargoQuantity,
  cargoSlotsValid,
  cargoTotal,
  loadCargo,
  unloadCargo,
} from './cargo.js';
export {
  advanceMovement,
  advanceTransport,
  planRoute,
  readTransportArrivals,
  startMovement,
  traversalTicks,
} from './route.js';
export type { RoutePath } from './route.js';
export { TRANSPORT_ARRIVALS_KEY } from './types.js';
export type {
  Cargo,
  CargoCompartmentPolicy,
  CargoEntry,
  CargoSlot,
  TransportArrival,
  TransportHandling,
  TransportMovement,
} from './types.js';
