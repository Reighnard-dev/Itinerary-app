import { DatabaseSync } from './runtime-db.js';

export const isHosted = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.ROAM_HOSTED_CATALOG === 'true');
export const hostedCatalogPath = 'data/netlify-catalog/catalog.sqlite';
export const hostedCatalog = isHosted ? new DatabaseSync(hostedCatalogPath, { readOnly: true }) : undefined;
export const hostedPublicConfig = hostedCatalog?.prepare('SELECT url, publishable_key FROM public_config').get() as
  { url: string; publishable_key: string } | undefined;
