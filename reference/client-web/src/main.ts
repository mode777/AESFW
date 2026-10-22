/**
 * Composition root (REF-14.1). Creates the worker, the session client, the
 * mirror, the view state, and the shell views.
 *
 * Source: REF-14.1, REF-14.2
 */
import { PROTOCOL_VERSION } from '@aesfw/protocol';
import { R0_CONTENT } from './content/r0.js';
import { createWorkerClient } from './session/client.js';
import { createMirror } from './store/mirror.js';
import { createViewState } from './store/view-state.js';
import { createDebugOverlay } from './views/debug-overlay.js';
import { createTopBar } from './views/top-bar.js';

const ACTOR_ID = 'owner.0';

/**
 * Mounts the reference client into `root` (REF-14.1).
 *
 * Source: REF-14.1
 */
export function mount(root: HTMLElement): void {
  const { client } = createWorkerClient();
  const view = createViewState();
  const metadata = { protocolVersion: PROTOCOL_VERSION, checksum: '', lastHash: '' };
  const mirror = createMirror({ requestSnapshot: () => client.subscribe(ACTOR_ID) });

  client.onMessage((response) => {
    switch (response.kind) {
      case 'ready':
        metadata.checksum = response.configuration_checksum;
        break;
      case 'snapshot':
        mirror.applySnapshot(response.snapshot);
        break;
      case 'delta':
        mirror.applyDelta(response.delta, response.events);
        break;
      default:
        break;
    }
  });

  const topBar = createTopBar(client, mirror, view);
  const debug = createDebugOverlay(mirror, view, metadata);
  root.append(topBar.el, debug.el);

  document.addEventListener('keydown', (event) => {
    if (event.key === '`') view.debug.set(!view.debug());
    if (event.key === ' ') {
      event.preventDefault();
      client.control('run');
    }
  });

  client.init([...R0_CONTENT]);
  client.subscribe(ACTOR_ID);
}

const app = document.getElementById('app');
if (app !== null) mount(app);
