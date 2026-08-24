# dsh-auth

Subscription OAuth sign-in as LLM provider routes for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — use your
**ChatGPT (Plus/Pro)**, **Claude (Pro/Max)** and **SuperGrok / X Premium**
subscriptions as model providers, with no API keys and **no dsh source
patch**. Bundled with [dsh-tui](https://github.com/ccch1mneyyy/dsh-TUI) (the
working-activity pattern); works in any composition that provides the `llm`
and `commands` services.

```
/model → pick openai-codex/gpt-5.6-sol …   ← routes mount automatically
/auth login openai-codex                    ← sign in once; refresh is automatic
```

**Status: experimental (M1).** The OAuth flows themselves are pi-ai's shipped
implementations (device-code and loopback callback included); this plugin adds
the hosting: credential storage, token refresh, adapter registration, and a
login surface over the `userQuestions` seam. Ecosystem-spec conformance
(`dsh-ecosystem-spec`) and the dsh-tui `/provider` wizard integration land in
M2/M3.

## What it does

- Mounts the pi-ai catalog providers that ship OAuth flows as `llm` registry
  routes: `openai-codex`, `anthropic`, `xai`. **Models appear in a picker
  only after that provider is signed in** (credential-gated listing) — sign
  in and the catalog appears, sign out and it disappears; model ids already
  saved in sessions stay resolvable either way.
- `/auth login [provider]` runs the provider's OAuth flow interactively —
  authorization URL / device code shown in a question panel, browser callback
  handled by the flow, credential persisted locally.
- Stored access tokens are refreshed automatically before each request
  (serialized per provider — concurrent requests never double-refresh a
  rotated token).
- `/auth status`, `/auth logout <provider>`; the `ctx.dshAuth` service
  exposes the same api for UIs (the dsh-tui `/provider` wizard in M2).

## Install

Into the selected dsh profile (bundled into dsh-tui releases later):

```sh
dsh plugin --profile dsh-tui add dsh-auth
# development checkout:
dsh plugin --profile dsh-tui add link:/absolute/path/to/dsh-auth
```

Then restart the TUI; `/` lists `auth`, `/model` lists the provider catalogs.

## Usage

```
/auth                          # status: which providers are signed in
/auth login                    # pick a provider interactively
/auth login openai-codex       # ChatGPT (Plus/Pro)
/auth login anthropic          # Claude (Pro/Max)
/auth login xai                # SuperGrok / X Premium
/auth logout anthropic
```

The waiting panel behaves the way pi's host does: an authorization URL is
**opened in your browser automatically** (never hand-copied — the URL is
hundreds of characters and wrap artifacts corrupt its `redirect_uri`), and
the panel offers *Copy authorization link* / *Open browser again* /
*Cancel sign-in*. Device-code flows open the verification page and make the
short code the copy target. OpenAI Codex also offers a **device-code login**
method at the start — the most robust path on headless or locked-down
machines (no localhost:1455 callback needed).

Model requests against a provider you have not signed in to fail loudly with
the `/auth login <provider>` hint — never silently.

## Configuration

```yaml
- id: dsh-auth
  name: 'dsh-auth'
  config:
    providers: [openai-codex, anthropic, xai]   # any non-empty subset
    # credentialsFile: /secure/path/credentials.json
```

- `credentialsFile` defaults to `$DSH_HOME/dsh-auth/credentials.json`
  (`~/.dsh/dsh-auth/credentials.json`), overridable with the
  `DSH_AUTH_CREDENTIALS` environment variable. The directory is created
  `0700`, the file `0600` (best-effort on Windows), and every write is
  atomic (temp file + rename).
- A route another adapter family already owns — an `llm-pi-ai` settings
  profile naming the same provider — is refused by the registry; the plugin
  logs the refusal and mounts the remaining routes. Keep one provider on one
  adapter.

## Security notes

- The credential file holds **long-lived refresh tokens**. It is never logged,
  never echoed through status surfaces (`/auth status` shows expiry metadata
  only), and a corrupt file fails loudly instead of being overwritten.
- Secret prompts warn that terminal input is not masked on this surface.
- Login refuses to run where no interactive surface is registered (no
  browser/GUI assumptions — remote and headless hosts get a clear error, per
  the ecosystem spec's remote-determinism rule).

## Development

```sh
pnpm install
pnpm verify     # build + headless smoke (credential store, refresh
                # serialization, prompt bridging, api surface)
```

The smoke suite runs without cordis or a harness: the pure modules are
exercised directly. Real end-to-end login needs an interactive host (dsh-tui)
and is verified manually per release.

## Roadmap

- **M2** — dsh-tui `/provider` wizard: an "OAuth sign-in" branch listing
  `ctx.dshAuth` providers with a native login panel (device code display,
  open-browser action, progress), and `/login` upgraded to account status.
- **M3** — `dsh-ecosystem-spec` conformance (manifest validation, admission
  fixtures) plus the remaining pi-ai OAuth providers (GitHub Copilot,
  OpenRouter, Kimi); community list entry.
- **M4** — Gemini: a custom Google device-code flow (pi-ai ships none; this
  is the one wheel this project plans to build itself).

## License

MIT
