/**
 * The R0 content passed to the worker (REF-14.4). The reference client is
 * built with the reference content package; the raw YAML is bundled as text.
 *
 * Source: REF-14.4
 */
import type { ContentSourceDto } from '@aesfw/protocol';
import packageYaml from '../../../content/ref.tier/package.yaml?raw';
import contentYaml from '../../../content/ref.tier/content.yaml?raw';

/** The R0 content sources (REF-5). */
export const R0_CONTENT: readonly ContentSourceDto[] = [
  {
    root: 'ref.tier',
    files: [
      { path: 'package.yaml', text: packageYaml },
      { path: 'content.yaml', text: contentYaml },
    ],
  },
];
