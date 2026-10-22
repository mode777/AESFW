/**
 * The worker entry point (TDS-21.1). Wires the session host to the real worker
 * global, timers, and IndexedDB. This file is browser-only and is covered by
 * the browser checks (VER-12, L8/L10).
 *
 * Source: TDS-21.1
 */
import { ids } from '@aesfw/core';
import type { SaveDocument } from '@aesfw/app';
import type { WorkerResponseDto } from '@aesfw/protocol';
import { createSessionHost } from './session-host.js';
import type { SaveStorage, SessionHostPort } from './session-host.js';

/** The worker entry point identifier. */
export const HOST_WEB_WORKER_ENTRY_ID = '@aesfw/host-web/worker' as const;

interface WorkerScope {
  postMessage(message: WorkerResponseDto): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  setTimeout(handler: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

const DB_NAME = 'aesfw';
const STORE_NAME = 'saves';

/** An IndexedDB-backed save store (TDS-21.1). */
function createIndexedDbStorage(): SaveStorage {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('indexeddb open failed'));
    });

  const run = async <T>(
    mode: IDBTransactionMode,
    make: (store: IDBObjectStore) => IDBRequest,
    project: (result: unknown) => T,
  ): Promise<T> => {
    const db = await open();
    const result = await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = make(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result as unknown);
      request.onerror = () => reject(request.error ?? new Error('indexeddb request failed'));
    });
    return project(result);
  };

  return {
    get(slot) {
      return run<SaveDocument | null>(
        'readonly',
        (store) => store.get(slot),
        (result) => (result === undefined ? null : (result as SaveDocument)),
      );
    },
    put(slot, doc) {
      return run<void>(
        'readwrite',
        (store) => store.put(doc, slot),
        () => undefined,
      );
    },
  };
}

/**
 * Creates the worker port over the worker global (TDS-21.1).
 *
 * Source: TDS-21.1
 */
function createWorkerPort(scope: WorkerScope): SessionHostPort {
  return {
    postMessage: (message) => scope.postMessage(message),
    onMessage: (handler) => scope.addEventListener('message', (event) => handler(event.data)),
  };
}

/**
 * Starts the worker session host (TDS-21.1).
 *
 * Source: TDS-21.1
 */
export function startWorkerHost(scope: WorkerScope = self): void {
  const host = createSessionHost({
    port: createWorkerPort(scope),
    storage: createIndexedDbStorage(),
    tickDurationMs: 100,
    actor: ids.ownerHandle(0),
    actorId: 'owner.0',
    setTimer: (fn, ms) => scope.setTimeout(fn, ms),
    clearTimer: (id) => scope.clearTimeout(id),
  });
  host.start();
}

// Start automatically when loaded as a worker module.
if (
  typeof self !== 'undefined' &&
  typeof (self as unknown as { document?: unknown }).document === 'undefined'
) {
  startWorkerHost();
}
