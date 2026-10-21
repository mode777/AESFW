/**
 * Main-thread entry point of `@aesfw/host-web`.
 *
 * This entry point depends only on `@aesfw/protocol` (TDS-4.2, TDS-4.3).
 * The `SessionClient` proxy is delivered by roadmap row 2.6 of
 * docs/08_Implementation_Roadmap.md. This stub implements no requirements yet.
 */
export const HOST_WEB_CLIENT_ENTRY_ID = '@aesfw/host-web/client' as const;
