import type { components } from './schema'

export type Health = components['schemas']['Health']

export class ApiError extends Error {}

const HEALTH_URL = '/api/health'
const HEALTH_OK = 'ok' satisfies Health['status']

const isHealth = (body: unknown): body is Health =>
  typeof body === 'object' && body !== null && 'status' in body && body.status === HEALTH_OK

export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const response = await fetch(HEALTH_URL, { signal })
  if (!response.ok) throw new ApiError(`${HEALTH_URL} responded with ${response.status}`)
  const body: unknown = await response.json()
  if (!isHealth(body)) throw new ApiError(`${HEALTH_URL} returned an unexpected body`)
  return body
}
