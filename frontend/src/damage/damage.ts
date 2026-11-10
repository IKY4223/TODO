import { isNumber, isRecord, postJson } from '../api/http'
import type { components } from '../api/schema'

export type Damage = components['schemas']['Damage']
export type DamageRequest = components['schemas']['DamageRequest']

const DAMAGE_URL = '/api/damage'

const isDamage = (value: unknown): value is Damage =>
  isRecord(value) && isNumber(value.non_crit) && isNumber(value.crit) && isNumber(value.average)

export async function fetchDamage(request: DamageRequest): Promise<Damage> {
  return postJson(DAMAGE_URL, request, isDamage)
}
