export class ApiError extends Error {}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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

/** GET a JSON body and prove its shape before it enters the app. */
export async function getJson<TBody>(
  url: string,
  isBody: (body: unknown) => body is TBody,
): Promise<TBody> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new ApiError((await errorDetail(response)) ?? `${url} responded with ${response.status}`)
  }
  const body: unknown = await response.json()
  if (!isBody(body)) throw new ApiError(`${url} returned an unexpected body`)
  return body
}
