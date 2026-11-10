interface ApiErrorOptions extends ErrorOptions {
  /** The HTTP status, when the server answered at all. */
  readonly status?: number
  /** How long the server asked the client to wait before trying again. */
  readonly retryAfterSeconds?: number
}

export class ApiError extends Error {
  readonly status: number | undefined
  readonly retryAfterSeconds: number | undefined

  constructor(message: string, { status, retryAfterSeconds, cause }: ApiErrorOptions = {}) {
    super(message, { cause })
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isNumber = (value: unknown): value is number => typeof value === 'number'
export const isString = (value: unknown): value is string => typeof value === 'string'

/** True when `value` is one of the table's own keys, not an inherited one like "toString". */
export const isKeyOf = <TTable extends object>(
  table: TTable,
  value: unknown,
): value is keyof TTable => isString(value) && Object.hasOwn(table, value)

export const isArrayOf = <TItem>(
  value: unknown,
  isItem: (item: unknown) => item is TItem,
): value is TItem[] => Array.isArray(value) && value.every(isItem)

/** The human-readable reason the API attaches to an error, when it has one. */
async function errorDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json()
    return isRecord(body) && typeof body.detail === 'string' ? body.detail : undefined
  } catch {
    // An error from a proxy or a crash has no JSON body; the caller falls back to the status.
    return undefined
  }
}

type Guard<TBody> = (body: unknown) => body is TBody

/** Prove the body's shape before it enters the app. */
async function readJson<TBody>(url: string, response: Response, isBody: Guard<TBody>): Promise<TBody> {
  if (!response.ok) {
    const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10)
    throw new ApiError((await errorDetail(response)) ?? `${url} responded with ${response.status}`, {
      status: response.status,
      retryAfterSeconds: Number.isNaN(retryAfter) ? undefined : retryAfter,
    })
  }
  const body: unknown = await response.json()
  if (!isBody(body)) throw new ApiError(`${url} returned an unexpected body`)
  return body
}

const REQUEST_TIMEOUT_MS = 15_000
const TIMEOUT_ERROR = 'TimeoutError'

/** fetch that gives up after a while, so a stalled mobile connection cannot hang a form. */
async function send(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === TIMEOUT_ERROR
    throw new ApiError(
      timedOut
        ? 'The server took too long to answer. Try again.'
        : 'Could not reach the server. Check your connection.',
      { cause: error },
    )
  }
}

export async function getJson<TBody>(url: string, isBody: Guard<TBody>): Promise<TBody> {
  return readJson(url, await send(url), isBody)
}

export async function postJson<TBody>(
  url: string,
  payload: unknown,
  isBody: Guard<TBody>,
): Promise<TBody> {
  const response = await send(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return readJson(url, response, isBody)
}
