import { isArrayOf, isNumber, isRecord, postJson } from '../api/http'
import type { components } from '../api/schema'

export type RelicForecast = components['schemas']['RelicForecast']
export type RelicQuery = components['schemas']['RelicQuery']

const FORECAST_URL = '/api/starrail/relics/forecast'

const isForecast = (value: unknown): value is RelicForecast =>
  isRecord(value) &&
  isNumber(value.upgrades) &&
  isArrayOf(value.chances, isNumber) &&
  isNumber(value.expected)

export async function fetchRelicForecast(query: RelicQuery): Promise<RelicForecast> {
  return postJson(FORECAST_URL, query, isForecast)
}
