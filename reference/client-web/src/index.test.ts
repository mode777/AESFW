import { describe, expect, it } from 'vitest';
import { CLIENT_WEB_ENTRY_ID } from './index.js';

describe('[TDS-4.2][TDS-4.3] @aesfw-ref/client-web package stub', () => {
  it('[TDS-4.2][TDS-4.3] resolves the simulation only through host-web client and protocol entries', async () => {
    const client = (await import('@aesfw/host-web/client')) as { HOST_WEB_CLIENT_ENTRY_ID: string };
    expect(client.HOST_WEB_CLIENT_ENTRY_ID).toBe('@aesfw/host-web/client');

    const protocol = (await import('@aesfw/protocol')) as { PROTOCOL_PACKAGE_ID: string };
    expect(protocol.PROTOCOL_PACKAGE_ID).toBe('@aesfw/protocol');

    expect(CLIENT_WEB_ENTRY_ID).toBe('@aesfw-ref/client-web');
  });
});
