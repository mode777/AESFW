/**
 * Delta application (PIC-18, P-10). `applyDelta` applies a `SnapshotDeltaDto`
 * to a base `SnapshotDto`; `canApplyDelta` implements the base-revision resync
 * rule. These live in `@aesfw/protocol` so the reference client, which may
 * import only the protocol, can apply deltas.
 *
 * Source: PIC-18, PIC-9.2
 */
import type { SnapshotDeltaDto, SnapshotDto } from './snapshot.js';

type MutableRecord = Record<string, unknown>;

const cloneSnapshot = (snapshot: SnapshotDto): SnapshotDto => ({
  session_id: snapshot.session_id,
  tick: snapshot.tick,
  revision: snapshot.revision,
  configuration_checksum: snapshot.configuration_checksum,
  owners: snapshot.owners.map((owner) => ({
    ...owner,
    resources: { ...owner.resources },
    ...(owner.balance === undefined
      ? {}
      : {
          balance: {
            ...owner.balance,
            deficit_paused_entities: [...owner.balance.deficit_paused_entities],
            ...(owner.balance.revenue_by_source === undefined
              ? {}
              : { revenue_by_source: { ...owner.balance.revenue_by_source } }),
            ...(owner.balance.expenses_by_source === undefined
              ? {}
              : { expenses_by_source: { ...owner.balance.expenses_by_source } }),
            ...(owner.balance.idle_paying_entities === undefined
              ? {}
              : { idle_paying_entities: [...owner.balance.idle_paying_entities] }),
          },
        }),
  })),
  locations: snapshot.locations.map((location) => ({
    ...location,
    ...(location.inventories === undefined
      ? {}
      : {
          inventories: location.inventories.map((inventory) => ({
            inventory_id: inventory.inventory_id,
            entries: inventory.entries.map((entry) => ({ ...entry })),
          })),
        }),
  })),
  entities: snapshot.entities.map((entity) => ({ ...entity })),
});

/** True when `delta` can be applied to `base` (PIC-18). */
export function canApplyDelta(base: SnapshotDto, delta: SnapshotDeltaDto): boolean {
  return delta.session_id === base.session_id && delta.from_revision === base.revision;
}

/**
 * Applies `delta` to `base`, returning a new snapshot (PIC-18). Fields the
 * delta does not mention are left unchanged.
 *
 * Source: PIC-18, PIC-9.2
 */
export function applyDelta(base: SnapshotDto, delta: SnapshotDeltaDto): SnapshotDto {
  const clone = cloneSnapshot(base);
  const entities = clone.entities as unknown as MutableRecord[];
  const byId = new Map<number, MutableRecord>();
  for (const entity of entities) byId.set(entity['entity_id'] as number, entity);

  for (const update of delta.entity_updates) {
    const entity = byId.get(update.entity_id);
    if (entity === undefined) continue;
    entity[update.component] = (update.fields as MutableRecord)[update.component];
  }

  const entries = new Map<string, MutableRecord>();
  for (const location of clone.locations) {
    if (location.inventories === undefined) continue;
    for (const inventory of location.inventories) {
      for (const entry of inventory.entries as unknown as MutableRecord[]) {
        entries.set(`${inventory.inventory_id}:${entry['resource_id'] as string}`, entry);
      }
    }
  }
  for (const update of delta.inventory_updates) {
    const entry = entries.get(`${update.inventory_id}:${update.resource_id}`);
    if (entry === undefined) continue;
    entry['stored'] = update.stored;
    entry['reserved'] = update.reserved;
  }

  if (delta.owner_updates !== undefined) {
    const owners = clone.owners as unknown as MutableRecord[];
    const byOwnerId = new Map<string, number>();
    owners.forEach((owner, index) => byOwnerId.set(owner['owner_id'] as string, index));
    for (const update of delta.owner_updates) {
      const index = byOwnerId.get(update.owner_id);
      if (index === undefined) continue;
      owners[index] = update as unknown as MutableRecord;
    }
  }

  return { ...clone, revision: delta.to_revision, tick: delta.tick };
}
