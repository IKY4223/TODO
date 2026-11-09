export class ApiError extends Error {}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** GET a JSON body and prove its shape before it enters the app. */
export async function getJson<TBody>(
  url: string,
  isBody: (body: unknown) => body is TBody,
): Promise<TBody> {
  const response = await fetch(url)
  if (!response.ok) throw new ApiError(`${url} responded with ${response.status}`)
  const body: unknown = await response.json()
  if (!isBody(body)) throw new ApiError(`${url} returned an unexpected body`)
  return body
}
