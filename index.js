/**
 * Host half of the DeepSeek balance widget.
 *
 * The sidebar widget lives in the browser, which must never see the account
 * credential, so the Host reads the signed-in Platform wallets through
 * `ctx.deepseekAccount` and publishes them on one same-origin JSON route.
 * The route caches a successful read briefly so independent polls never turn
 * into a burst of Platform queries.
 */

/** Same-origin route the sidebar widget polls. */
const ROUTE_PATH = '/plugin/deepseek-balance'

/** Client metadata sent to Platform; only telemetry fields, never a secret. */
const CLIENT_VERSION = '1.0.0'

/** How long a successful balance read is served from memory. */
const SUCCESS_TTL_MS = 10_000

/** How long a failed read is served from memory, to avoid hammering Platform. */
const FAILURE_TTL_MS = 4_000

/** Message text of an unknown thrown value. */
function messageOf(error) {
  if (error instanceof Error && error.message) return error.message
  return String(error)
}

/** The `AccountClientMetadata` every Platform call carries. */
function clientMetadata() {
  return {
    version: CLIENT_VERSION,
    locale: 'en',
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
}

/**
 * Read the current wallets. Never throws: every failure is a status the widget
 * can render.
 */
async function readBalance(ctx) {
  const account = ctx.get('deepseekAccount')
  if (account === undefined) return { ok: false, state: 'unavailable', reason: 'account-service-missing' }

  let view
  try {
    view = await account.getState()
  } catch (error) {
    return { ok: false, state: 'error', reason: messageOf(error) }
  }
  if (view === null || view === undefined || view.status !== 'credential-stored') {
    return { ok: false, state: 'signed-out' }
  }

  let details
  try {
    details = await account.getBalance(clientMetadata())
  } catch (error) {
    return { ok: false, state: 'error', reason: messageOf(error) }
  }
  if (details === null || details === undefined) return { ok: false, state: 'signed-out' }
  if (details.status !== 'ready') return { ok: false, state: 'error', reason: 'platform-query-failed' }

  return {
    ok: true,
    state: 'ready',
    wallets: Array.isArray(details.value) ? details.value : [],
    bonusWallets: Array.isArray(details.bonusWallets) ? details.bonusWallets : [],
    updatedAt: Date.now(),
  }
}

/** Write one JSON response. */
function reply(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

export function apply(ctx) {
  /** Last completed read: { at, ttl, value }. */
  let cached
  /** The read currently talking to Platform, shared by concurrent callers. */
  let pending

  /** How many requests the page itself has made, ignoring manual probes. */
  let clientPolls = 0

  /** Cached balance payload for one poll. */
  async function current() {
    if (cached !== undefined && Date.now() - cached.at < cached.ttl) return cached.value
    if (pending !== undefined) return pending
    pending = (async () => {
      try {
        const value = await readBalance(ctx)
        cached = {
          at: Date.now(),
          ttl: value.ok ? SUCCESS_TTL_MS : FAILURE_TTL_MS,
          value,
        }
        return value
      } finally {
        pending = undefined
      }
    })()
    return pending
  }

  ctx.inject(['webServer'], (scope) => {
    scope.effect(() => scope.webServer.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: async (req, res) => {
        if (req.method !== 'GET') {
          reply(res, 405, { ok: false, state: 'method-not-allowed' })
          return
        }
        if (String(req.headers['user-agent'] ?? '') !== 'dsh-probe') clientPolls += 1
        let value
        try {
          value = await current()
        } catch (error) {
          value = { ok: false, state: 'error', reason: messageOf(error) }
        }
        reply(res, 200, Object.assign({}, value, { clientPolls }))
      },
    }))
  })
}
