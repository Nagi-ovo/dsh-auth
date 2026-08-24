/**
 * Provider routes this plugin owns: the pi-ai catalog providers that ship an
 * OAuth flow, mounted with their catalog models, wire implementations, and
 * OAuth flow objects untouched. Credential resolution is not wrapped at all —
 * the adapter's collection carries this plugin's `CredentialStore`
 * (`PiAiAuthInjection`), so requests resolve the stored OAuth credential
 * through the provider's own auth and refresh tokens under the store's lock.
 *
 * The hand-built profile mirrors what an empty llm-pi-ai settings profile
 * resolves to for a catalog route, including the image-request defaults
 * (llm-pi-ai's own `DEFAULT_*` constants are not exported; the values below
 * are those constants, and the comment on each says so).
 *
 * @module dsh-auth/profiles
 */

import { builtinProviders } from '@earendil-works/pi-ai/providers/all'
import type { Provider } from '@earendil-works/pi-ai'
import { resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'

/** Provider routes this build mounts, in picker order. */
export const OAUTH_PROVIDER_IDS = ['openai-codex', 'anthropic', 'xai'] as const

/** One routable provider id. */
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number]

/** llm-pi-ai `DEFAULT_MAX_REQUEST_IMAGE_BYTES` (20 MiB, base64 payload bound). */
const MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024
/** llm-pi-ai `DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET` (2048×2048 pixels). */
const REQUEST_IMAGE_PIXEL_BUDGET = 2048 * 2048
/** llm-pi-ai `DEFAULT_REQUEST_IMAGE_MAX_BYTES` (1 MiB per image). */
const REQUEST_IMAGE_MAX_BYTES = 1024 * 1024
/** llm-pi-ai `DEFAULT_STREAM_IDLE_TIMEOUT_MS` (5 minutes). */
const STREAM_IDLE_TIMEOUT_MS = 300_000

/** The installed pi-ai catalog provider for one route, whose OAuth flow we mount. */
function catalogProviderOf(id: string): Provider {
  const found = builtinProviders().find(provider => provider.id === id)
  if (found === undefined) {
    throw new Error(
      `dsh-auth: the installed pi-ai catalog ships no provider "${id}"; `
      + 'remove it from this plugin\'s providers config or update pi-ai',
    )
  }
  return found
}

/** The OAuth flow object for one mounted route (login/refresh/toAuth live here). */
export function oauthOf(route: Provider): NonNullable<Provider['auth']['oauth']> {
  const oauth = route.auth.oauth
  if (oauth === undefined) {
    throw new Error(`dsh-auth: pi-ai provider "${route.id}" ships no OAuth flow`)
  }
  return oauth
}

/**
 * Build the resolved profile one route registers under. Mirrors the fields
 * `PiAiAdapter` reads: identity for selectors, the idle timeout, retry
 * policy, and image budgets it forwards per request, and the catalog provider
 * with its own models. Everything optional stays absent — the adapter treats
 * absence as "provider defaults" exactly as an empty llm-pi-ai profile would.
 */
export function buildOAuthProfile(id: string): ResolvedPiAiProviderProfile {
  if (!(OAUTH_PROVIDER_IDS as readonly string[]).includes(id)) {
    throw new Error(`dsh-auth: "${id}" is not an OAuth provider this build mounts (${OAUTH_PROVIDER_IDS.join(', ')})`)
  }
  const catalog = catalogProviderOf(id)
  return {
    provider: id,
    displayName: catalog.name,
    streamIdleTimeoutMs: STREAM_IDLE_TIMEOUT_MS,
    retryPolicy: resolveRetryPolicy(undefined, `dsh-auth: provider "${id}" retryPolicy`),
    configuredMaxTokens: new Map(),
    piProvider: catalog,
    maxRequestImageBytes: MAX_REQUEST_IMAGE_BYTES,
    requestImagePixelBudget: REQUEST_IMAGE_PIXEL_BUDGET,
    requestImageMaxBytes: REQUEST_IMAGE_MAX_BYTES,
  }
}
