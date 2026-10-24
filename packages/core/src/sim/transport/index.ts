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
export {
  actionTarget,
  advanceTransportOrders,
  assignTransport,
  assignedOrderOf,
  collectTransportHandlingRequests,
  commitTransportOrders,
  createTransportOrder,
  defaultFailurePolicies,
  deleteTransportOrder,
  modifyTransportOrder,
  planTransportOrders,
  readTransportHandling,
  routeStateOf,
  stationCursorOf,
  tradeTarget,
  transportOrderOf,
  unassignTransport,
} from './orders.js';
export { executeTrades } from './trades.js';
export type { RoutePath } from './route.js';
export { TRANSPORT_ARRIVALS_KEY, TRANSPORT_HANDLING_KEY } from './types.js';
export type {
  Cargo,
  CargoCompartmentPolicy,
  CargoEntry,
  CargoSlot,
  TransportArrival,
  TransportHandling,
  FailureKey,
  FailurePolicies,
  FailurePolicy,
  PendingTransportTransfer,
  QuantityRule,
  RouteState,
  StationAction,
  StationCursor,
  StationSpec,
  TransportAction,
  TransportAssignment,
  TransportMovement,
  TransportOrder,
  TransportOrderMode,
  TransportOrderSpec,
} from './types.js';
