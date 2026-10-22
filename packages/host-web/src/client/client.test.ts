import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION } from '@aesfw/protocol';
import type { WorkerRequestDto, WorkerResponseDto } from '@aesfw/protocol';
import { createSessionClient } from './index.js';
import type { SessionClientPort } from './index.js';

class FakeClientPort implements SessionClientPort {
  readonly messages: WorkerRequestDto[] = [];
  private handler: ((data: unknown) => void) | null = null;
  postMessage(message: WorkerRequestDto): void {
    this.messages.push(message);
  }
  onMessage(handler: (data: unknown) => void): void {
    this.handler = handler;
  }
  emit(data: unknown): void {
    this.handler?.(data);
  }
}

describe('[TDS-21.1] session client', () => {
  it('[TDS-21.1] the client sends a command message', () => {
    const port = new FakeClientPort();
    const client = createSessionClient(port);
    client.command({
      command_id: 'c1',
      actor_id: 'test.owner.1',
      type: 'SetEntityEnabled',
      payload: { entity_id: 1, enabled: false },
    });
    expect(port.messages).toHaveLength(1);
    expect(port.messages[0]?.kind).toBe('command');
    expect(port.messages[0]?.protocol_version).toBe(PROTOCOL_VERSION);
  });

  it('[TDS-21.1] the client delivers decoded responses', () => {
    const port = new FakeClientPort();
    const client = createSessionClient(port);
    const received: WorkerResponseDto[] = [];
    client.onMessage((response) => received.push(response));
    port.emit({
      kind: 'ready',
      protocol_version: PROTOCOL_VERSION,
      session_id: 's1',
      tick: 0,
      revision: 0,
      configuration_checksum: 'c',
    });
    expect(received).toHaveLength(1);
    expect(received[0]?.kind).toBe('ready');
  });
});
