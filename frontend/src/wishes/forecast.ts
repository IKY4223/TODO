import { getJson, isRecord } from '../api/http'
import type { components, paths } from '../api/schema'

export type Forecast = components['schemas']['Forecast']
export type ForecastQuery = paths['/api/wishes/forecast']['get']['parameters']['query']
type Milestone = components['schemas']['Milestone']

const FORECAST_URL = '/api/wishes/forecast'

const isMilestone = (value: unknown): value is Milestone =>
  isRecord(value) && typeof value.chance === 'number' && typeof value.pulls === 'number'

const isForecast = (value: unknown): value is Forecast =>
  isRecord(value) &&
  typeof value.probability === 'number' &&
  typeof value.guaranteed_at === 'number' &&
  Array.isArray(value.milestones) &&
  value.milestones.every(isMilestone)

export async function fetchForecast(query: ForecastQuery): Promise<Forecast> {
  const search = new URLSearchParams(
    Object.entries(query).map(([name, value]) => [name, String(value)]),
  )
  return getJson(`${FORECAST_URL}?${search}`, isForecast)
}
