/**
 * Worker wiring for the client (REF-14.1). Creates the worker and the
 * main-thread `SessionClient` proxy.
 *
 * Source: REF-14.1, TDS-21.1
 */
import { createSessionClient } from '@aesfw/host-web/client';
import type { SessionClient } from '@aesfw/host-web/client';
import SessionWorker from '@aesfw/host-web/worker?worker';

/** The worker client pair. */
export interface WorkerClient {
  readonly client: SessionClient;
  readonly worker: Worker;
}

/**
 * Creates the worker and its client proxy (REF-14.1).
 *
 * Source: REF-14.1, TDS-21.1
 */
export function createWorkerClient(): WorkerClient {
  const worker = new SessionWorker();
  const client = createSessionClient({
    postMessage: (message) => worker.postMessage(message),
    onMessage: (handler) => worker.addEventListener('message', (event) => handler(event.data)),
  });
  return { client, worker };
}
