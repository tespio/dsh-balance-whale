/**
 * Browser half of the DeepSeek balance widget.
 *
 * A compact, always-visible chip in the sidebar footer (beside Settings) that
 * shows the signed-in account's DeepSeek Platform balance and the current
 * pricing period, drawn as the official whale: swimming during peak hours,
 * asleep during off-peak hours. It polls the Host route served by `index.js`,
 * refreshes on focus and click, and degrades to a readable status instead of
 * disappearing when the balance is unavailable.
 *
 * The pricing rule is the one used by the user's DeepSeek Status project
 * (https://github.com/tespio/DeepSeekStatus): peak is Monday–Friday 09:00–12:00 and 14:00–18:00
 * Beijing time (UTC+8); weekends and Chinese public holidays are off-peak all
 * day; off-peak costs half of peak.
 */
window.__ModuleLoader__.load({
  id: 'dsh-balance-whale',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Client locale namespace owned by this bundle. */
    const NS = 'deepseek-balance-widget'
    /** Same-origin Host route that returns the wallets. */
    const ROUTE = '/plugin/deepseek-balance'
    /** Balance is polled in the background on this cadence. */
    const POLL_MS = 30000
    /** A single read gives up after this long, so one hung request cannot stop the poller. */
    const TIMEOUT_MS = 12000

    /** Official 24×24 DeepSeek whale mark (Simple Icons, CC0), as used by the project. */
    const WHALE_PATH = "M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45"
    /** Chinese public holidays ("YYYY-MM-DD") from the State Council notices. */
    const HOLIDAYS = new Set(["2025-01-01","2025-01-28","2025-01-29","2025-01-30","2025-01-31","2025-02-01","2025-02-02","2025-02-03","2025-02-04","2025-04-04","2025-04-05","2025-04-06","2025-05-01","2025-05-02","2025-05-03","2025-05-04","2025-05-05","2025-05-31","2025-06-01","2025-06-02","2025-10-01","2025-10-02","2025-10-03","2025-10-04","2025-10-05","2025-10-06","2025-10-07","2025-10-08","2026-01-01","2026-01-02","2026-01-03","2026-02-15","2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20","2026-02-21","2026-02-22","2026-02-23","2026-04-04","2026-04-05","2026-04-06","2026-05-01","2026-05-02","2026-05-03","2026-05-04","2026-05-05","2026-06-19","2026-06-20","2026-06-21","2026-09-25","2026-09-26","2026-09-27","2026-10-01","2026-10-02","2026-10-03","2026-10-04","2026-10-05","2026-10-06","2026-10-07"])

    /** Beijing has no daylight saving, so a fixed offset is exact. */
    const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000
    const DAY_MS = 24 * 60 * 60 * 1000
    /** Peak minute ranges inside a Beijing working day, half-open. */
    const PEAK_RANGES = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]]
    /** Weekday numbers: 0 is Sunday. */
    const WEEKEND = [0, 6]

    const DICTS = {
      en: {
        title: 'DeepSeek balance',
        loading: 'Loading balance…',
        signedOut: 'Not signed in — sign in from Settings → Account',
        unavailable: 'Balance unavailable',
        recharge: 'Recharge',
        bonus: 'Bonus',
        updated: 'Updated',
        secondsAgo: '{n}s ago',
        minutesAgo: '{n}m ago',
        autoNote: 'Refreshes automatically every {n}s',
        refreshFailed: 'Last refresh failed — retrying',
        peak: 'Peak',
        offPeak: 'Off-peak',
        peakDetail: 'Peak hours · full price (×1.0)',
        offPeakDetail: 'Off-peak hours · half price (×0.5)',
        weekend: 'Weekend — off-peak all day',
        holiday: 'Chinese public holiday — off-peak all day',
        switchLine: 'Switches to {to} in {when} ({time})',
      },
      zh: {
        title: 'DeepSeek 余额',
        loading: '正在获取余额…',
        signedOut: '未登录 — 请在 设置 → 账号 中登录',
        unavailable: '暂时无法获取余额',
        recharge: '充值余额',
        bonus: '赠送余额',
        updated: '更新于',
        secondsAgo: '{n} 秒前',
        minutesAgo: '{n} 分钟前',
        autoNote: '每 {n} 秒自动刷新',
        refreshFailed: '上次刷新失败，正在重试',
        peak: '高峰',
        offPeak: '空闲',
        peakDetail: '高峰时段 · 全价（×1.0）',
        offPeakDetail: '空闲时段 · 半价（×0.5）',
        weekend: '周末 — 全天空闲',
        holiday: '法定节假日 — 全天空闲',
        switchLine: '下次切换至{to}：{when}后（{time}）',
      },
    }

    /** The chip's own styles, scoped to its class and driven by theme tokens. */
    const CSS = [
      '.dshbw{display:inline-flex;align-items:center;box-sizing:border-box;gap:6px;height:28px;max-width:100%;padding:0 9px;',
      'border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;',
      'color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12px;font-weight:500;line-height:1;',
      'font-variant-numeric:tabular-nums;letter-spacing:.01em;white-space:nowrap;cursor:pointer;flex:0 0 auto;',
      'transition:background-color .16s ease,border-color .16s ease}',
      '.dshbw:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dshbw:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
      '.dshbw[data-rail="true"]{height:24px;gap:4px;padding:0 5px;border-color:transparent;font-size:10px}',
      '.dshbw-whale{display:block;width:20px;height:20px;flex:0 0 auto;overflow:visible}',
      '.dshbw[data-rail="true"] .dshbw-whale{width:17px;height:17px}',
      '.dshbw-amount{overflow:hidden;text-overflow:ellipsis}',
      '.dshbw-period{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:600;letter-spacing:.02em}',
      '.dshbw[data-period="peak"] .dshbw-period{color:var(--dsw-alias-state-warn-primary)}',
      '.dshbw[data-period="offPeak"] .dshbw-period{color:var(--dsw-alias-state-success-primary)}',
      '.dshbw[data-phase="signed-out"] .dshbw-amount,.dshbw[data-phase="unavailable"] .dshbw-amount{color:var(--dsw-alias-label-secondary)}',
      '.dshbw-fill{fill:var(--dsw-alias-brand-primary)}',
      '.dshbw[data-period="offPeak"] .dshbw-fill{fill:#93a1c4}',
      '.dshbw-body{transform-box:fill-box;transform-origin:50% 55%}',
      '.dshbw[data-period="peak"] .dshbw-body{animation:dshbw-swim 4.05s ease-in-out infinite}',
      '.dshbw[data-period="offPeak"] .dshbw-body{animation:dshbw-sleep 6s ease-in-out infinite}',
      '.dshbw-bubble{fill:#7a9eff;transform-box:fill-box;transform-origin:50% 50%;animation:dshbw-bubble 3.4s ease-out infinite}',
      '.dshbw-z{fill:none;stroke:#93a1c4;stroke-width:1.05;stroke-linecap:round;stroke-linejoin:round;',
      'transform-box:fill-box;transform-origin:50% 50%;animation:dshbw-z 4.2s ease-out infinite}',
      '@keyframes dshbw-swim{0%,100%{transform:translateY(0) rotate(-3.5deg)}50%{transform:translateY(-1.2px) rotate(3.5deg)}}',
      '@keyframes dshbw-sleep{0%,100%{transform:rotate(-5deg) scale(.94)}50%{transform:rotate(-4deg) scale(.975)}}',
      '@keyframes dshbw-bubble{0%{transform:translate(0,0);opacity:0}25%{opacity:.75}100%{transform:translate(2.2px,-8px);opacity:0}}',
      '@keyframes dshbw-z{0%{transform:translate(0,0) scale(.7);opacity:0}30%{opacity:.85}100%{transform:translate(2.6px,-5.5px) scale(1.1);opacity:0}}',
      '@media (prefers-reduced-motion:reduce){.dshbw,.dshbw-body,.dshbw-bubble,.dshbw-z{transition:none;animation:none!important}}',
    ].join('')

    function pad2(value) {
      return value < 10 ? '0' + value : String(value)
    }

    /** Beijing calendar fields for one instant. */
    function beijingParts(ms) {
      const date = new Date(ms + BEIJING_OFFSET_MS)
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        weekday: date.getUTCDay(),
        minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
      }
    }

    function dayKey(parts) {
      return parts.year + '-' + pad2(parts.month) + '-' + pad2(parts.day)
    }

    /** True when the Beijing day cannot contain a peak hour. */
    function allDayOffPeak(parts) {
      return WEEKEND.indexOf(parts.weekday) !== -1 || HOLIDAYS.has(dayKey(parts))
    }

    /** The pricing period at one instant: 'peak' or 'offPeak'. */
    function periodAt(ms) {
      const parts = beijingParts(ms)
      if (allDayOffPeak(parts)) return 'offPeak'
      for (const range of PEAK_RANGES) {
        if (parts.minutes >= range[0] && parts.minutes < range[1]) return 'peak'
      }
      return 'offPeak'
    }

    /** The next instant the period changes, or null when nothing changes in two weeks. */
    function nextTransition(ms) {
      const current = periodAt(ms)
      const today = beijingParts(ms)
      const midnight = Date.UTC(today.year, today.month - 1, today.day) - BEIJING_OFFSET_MS
      for (let day = 0; day < 15; day += 1) {
        const dayStart = midnight + day * DAY_MS
        const weekday = beijingParts(dayStart).weekday
        if (WEEKEND.indexOf(weekday) !== -1) continue
        for (const range of PEAK_RANGES) {
          for (const minutes of range) {
            const candidate = dayStart + minutes * 60 * 1000
            if (candidate > ms && periodAt(candidate) !== current) return candidate
          }
        }
      }
      return null
    }

    /** "2h 14m" / "13m" for a forward-looking duration. */
    function formatDuration(ms) {
      const totalMinutes = Math.max(1, Math.round(ms / 60000))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm'
    }

    function fillTemplate(template, params) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => (
        params[key] === undefined ? match : String(params[key])
      ))
    }

    /** Locale lookup with a bundled fallback, so text never renders as a key. */
    function translate(locale, key) {
      try {
        if (locale !== undefined && locale !== null) {
          const bound = locale.bind(NS)
          const lookup = typeof bound === 'function' ? bound : (bound && bound.t)
          if (typeof lookup === 'function') {
            const value = lookup(key)
            if (typeof value === 'string' && value !== '' && value !== key) return value
          }
        }
      } catch (error) {
        // A locale service that rejects the namespace must not blank the chip.
      }
      return DICTS.en[key] !== undefined ? DICTS.en[key] : key
    }

    /** Re-render on locale changes and expose the translator. */
    function useTranslator(locale) {
      const [, bump] = React.useState(0)
      React.useEffect(() => {
        if (locale === undefined || locale === null || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => bump((generation) => generation + 1))
      }, [locale])
      return (key) => translate(locale, key)
    }

    /** Read one balance payload from the Host route. */
    async function readBalance(signal) {
      const response = await fetch(ROUTE, {
        method: 'GET',
        cache: 'no-store',
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
        signal,
      })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      return response.json()
    }

    /**
     * Self-refreshing balance state.
     *
     * Polls on its own cadence, refreshes whenever the page becomes visible,
     * regains focus or comes back online, and never lets one failed or hung
     * read erase a balance it already has: the last good value stays on screen
     * while the next attempt runs.
     */
    function useBalance() {
      const [state, setState] = React.useState({ phase: 'loading' })
      const busy = React.useRef(false)
      const alive = React.useRef(true)

      const load = React.useCallback(async () => {
        if (busy.current) return false
        busy.current = true
        const controller = typeof AbortController === 'function' ? new AbortController() : null
        const timer = controller === null ? null : setTimeout(() => { controller.abort() }, TIMEOUT_MS)
        try {
          const payload = await readBalance(controller === null ? undefined : controller.signal)
          if (!alive.current) return false
          if (payload !== null && typeof payload === 'object' && payload.ok === true) {
            setState({
              phase: 'ready',
              wallets: Array.isArray(payload.wallets) ? payload.wallets : [],
              bonusWallets: Array.isArray(payload.bonusWallets) ? payload.bonusWallets : [],
              updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.now(),
              error: false,
            })
            return true
          }
          const signedOut = payload !== null && typeof payload === 'object' && payload.state === 'signed-out'
          setState((previous) => {
            if (signedOut) return { phase: 'signed-out' }
            if (previous.phase === 'ready') return Object.assign({}, previous, { error: true })
            return { phase: 'error' }
          })
          return false
        } catch (error) {
          if (!alive.current) return false
          setState((previous) => (
            previous.phase === 'ready'
              ? Object.assign({}, previous, { error: true })
              : { phase: 'error' }
          ))
          return false
        } finally {
          if (timer !== null) clearTimeout(timer)
          busy.current = false
        }
      }, [])

      React.useEffect(() => {
        alive.current = true
        if (typeof fetch !== 'function') {
          setState({ phase: 'unavailable' })
          return () => { alive.current = false }
        }

        // The page may be served over HTTP or, in the desktop app, loaded from
        // file:// with fetch bridged over IPC by the shell; both answer this
        // relative URL, so never gate the poller on the page's protocol.
        let cancelled = false
        let timer = null
        let retry = 0

        const run = async () => {
          const ok = await load()
          if (cancelled) return
          // A failed read retries soon and backs off; a good one settles on the
          // steady cadence. Nothing here needs a click.
          retry = ok ? 0 : Math.min(retry === 0 ? 4000 : retry * 2, POLL_MS)
          timer = setTimeout(run, ok ? POLL_MS : retry)
        }

        run()

        const kick = () => { load() }
        const onVisibility = () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') kick()
        }
        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('focus', kick)
        window.addEventListener('online', kick)
        return () => {
          cancelled = true
          alive.current = false
          if (timer !== null) clearTimeout(timer)
          document.removeEventListener('visibilitychange', onVisibility)
          window.removeEventListener('focus', kick)
          window.removeEventListener('online', kick)
        }
      }, [load])

      return [state, load]
    }

    function toAmount(value) {
      const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
      return Number.isFinite(parsed) ? parsed : 0
    }

    /** Sum wallets per currency; an account can carry more than one currency. */
    function totalsByCurrency(wallets) {
      const totals = new Map()
      for (const wallet of wallets) {
        if (wallet === null || typeof wallet !== 'object') continue
        const currency = typeof wallet.currency === 'string' ? wallet.currency : ''
        totals.set(currency, (totals.get(currency) || 0) + toAmount(wallet.balance))
      }
      return totals
    }

    function symbolOf(currency) {
      if (currency === 'USD') return '$'
      if (currency === 'CNY') return '¥'
      return currency === '' ? '' : currency + ' '
    }

    function formatAmount(amount) {
      return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    /** The amount the chip shows: spendable total, USD first when both exist. */
    function primaryAmount(state) {
      if (state.phase !== 'ready') return null
      const spendable = Array.from(totalsByCurrency(state.wallets.concat(state.bonusWallets)))
      if (spendable.length === 0) return null
      const picked = spendable.find((entry) => entry[0] === 'USD') || spendable[0]
      return { text: symbolOf(picked[0]) + formatAmount(picked[1]) }
    }

    /** Local clock time of one instant, for the "switches at" hint. */
    function clockOf(ms) {
      try {
        return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch (error) {
        return ''
      }
    }

    /** "12s ago" / "3m ago" for the last successful refresh. */
    function relativeAge(at, now, t) {
      const seconds = Math.max(0, Math.round((now - at) / 1000))
      if (seconds < 60) return fillTemplate(t('secondsAgo'), { n: seconds })
      return fillTemplate(t('minutesAgo'), { n: Math.round(seconds / 60) })
    }

    /** Tooltip and accessible name: period, countdown, then the wallets. */
    function describe(state, period, transition, now, t) {
      const lines = []
      const amount = primaryAmount(state)
      if (state.phase === 'ready') {
        lines.push(t('title') + ': ' + (amount === null ? '—' : amount.text))
      } else if (state.phase === 'loading') {
        lines.push(t('title') + ': ' + t('loading'))
      } else if (state.phase === 'signed-out') {
        lines.push(t('title') + ': ' + t('signedOut'))
      } else {
        lines.push(t('title') + ': ' + t('unavailable'))
      }

      lines.push(period === 'peak' ? t('peakDetail') : t('offPeakDetail'))
      if (period === 'offPeak') {
        const parts = beijingParts(now)
        if (HOLIDAYS.has(dayKey(parts))) lines.push(t('holiday'))
        else if (WEEKEND.indexOf(parts.weekday) !== -1) lines.push(t('weekend'))
      }
      if (transition !== null) {
        const nextPeriod = periodAt(transition)
        lines.push(fillTemplate(t('switchLine'), {
          to: nextPeriod === 'peak' ? t('peak') : t('offPeak'),
          when: formatDuration(transition - now),
          time: clockOf(transition),
        }))
      }

      if (state.phase === 'ready') {
        for (const entry of totalsByCurrency(state.wallets)) {
          lines.push(t('recharge') + ' ' + symbolOf(entry[0]) + formatAmount(entry[1]))
        }
        for (const entry of totalsByCurrency(state.bonusWallets)) {
          if (entry[1] !== 0) lines.push(t('bonus') + ' ' + symbolOf(entry[0]) + formatAmount(entry[1]))
        }
        if (typeof state.updatedAt === 'number') {
          lines.push(t('updated') + ' ' + relativeAge(state.updatedAt, now, t))
        }
        if (state.error === true) lines.push(t('refreshFailed'))
      } else if (state.phase === 'error') {
        lines.push(t('refreshFailed'))
      }
      lines.push(fillTemplate(t('autoNote'), { n: Math.round(POLL_MS / 1000) }))
      return lines.join('\n')
    }

    /** The Z glyph drawn above a sleeping whale. */
    const Z_PATH = 'M-1.7 -1.7 L1.7 -1.7 L-1.7 1.7 L1.7 1.7'

    /** The DeepSeek whale: swimming with bubbles at peak, asleep with Zs off-peak. */
    function WhaleIcon(props) {
      const sleeping = props.period !== 'peak'
      const marks = []
      if (sleeping) {
        for (let index = 0; index < 3; index += 1) {
          marks.push(h(
            'g',
            { key: 'z' + index, transform: 'translate(' + (16.6 + index * 1.35) + ' ' + (7.2 - index * 1.45) + ')' },
            h('path', { className: 'dshbw-z', d: Z_PATH, style: { animationDelay: (index * 1.35) + 's' } }),
          ))
        }
      } else {
        for (let index = 0; index < 3; index += 1) {
          marks.push(h('circle', {
            key: 'bubble' + index,
            className: 'dshbw-bubble',
            cx: 22.1 - index * 0.55,
            cy: 16.2 + index * 1.15,
            r: 0.5 + index * 0.2,
            style: { animationDelay: (index * 0.95) + 's' },
          }))
        }
      }
      return h(
        'svg',
        { className: 'dshbw-whale', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
        h('g', { key: 'body', className: 'dshbw-body' }, h('path', { className: 'dshbw-fill', d: WHALE_PATH })),
        marks,
      )
    }

    /** The sidebar-footer chip. */
    function BalanceWidget(props) {
      const locale = props.locale
      const t = useTranslator(locale)
      const [state, load] = useBalance()
      const [now, setNow] = React.useState(() => Date.now())
      const period = periodAt(now)
      const transition = nextTransition(now)

      React.useEffect(() => {
        // Wake exactly when the period changes, and otherwise once a minute so
        // the tooltip's countdown and "updated …" age stay honest.
        const untilSwitch = transition === null ? Number.POSITIVE_INFINITY : transition - Date.now() + 150
        const delay = Math.max(250, Math.min(60000, untilSwitch))
        const timer = setTimeout(() => setNow(Date.now()), delay)
        return () => clearTimeout(timer)
      }, [now, transition])

      const wide = props.wide !== false
      const amount = primaryAmount(state)
      const label = amount !== null ? amount.text : (state.phase === 'loading' ? '···' : '—')
      const tooltip = describe(state, period, transition, now, t)

      return h(
        React.Fragment,
        null,
        h('style', { key: 'css' }, CSS),
        h(
          'button',
          {
            key: 'chip',
            type: 'button',
            className: 'dshbw',
            'data-rail': wide ? 'false' : 'true',
            'data-phase': state.phase,
            'data-period': period,
            title: tooltip,
            'aria-label': tooltip,
            onClick: () => {
              setNow(Date.now())
              load()
            },
          },
          h(WhaleIcon, { key: 'whale', period }),
          h('span', { className: 'dshbw-amount', key: 'amount' }, label),
          wide ? h('span', { className: 'dshbw-period', key: 'period' }, t(period === 'peak' ? 'peak' : 'offPeak')) : null,
        ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale')

        if (locale !== undefined && locale !== null && typeof locale.register === 'function') {
          ctx.effect(() => {
            const disposers = []
            try {
              disposers.push(locale.register(NS, 'en', DICTS.en))
              disposers.push(locale.register(NS, 'zh', DICTS.zh))
            } catch (error) {
              // Keep the bundled English copy when the namespace is already taken.
            }
            return () => {
              for (const dispose of disposers) {
                try {
                  dispose()
                } catch (error) {
                  // Already disposed by the locale service.
                }
              }
            }
          })
        }

        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
          {
            name: 'sidebar.footer.action',
            id: 'deepseek-balance',
            order: 40,
            label: () => translate(locale, 'title'),
          },
          (props) => h(BalanceWidget, Object.assign({}, props, { locale })),
        ))
      },
    }
  },
})
