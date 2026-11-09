import { getJson, isArrayOf, isRecord } from '../api/http'
import type { components } from '../api/schema'

type Schemas = components['schemas']
export type Showcase = Schemas['Showcase']
export type Character = Schemas['Character']
export type Artifact = Schemas['Artifact']
export type Stat = Schemas['Stat']
type Weapon = Schemas['Weapon']

interface StatInfo {
  readonly label: string
  /** Percent stats arrive as fractions: 0.466 is 46.6%. */
  readonly percent: boolean
}

// `satisfies` makes a stat, slot or element added to the API a compile error here.
export const STATS = {
  hp: { label: 'HP', percent: false },
  hp_percent: { label: 'HP', percent: true },
  atk: { label: 'ATK', percent: false },
  atk_percent: { label: 'ATK', percent: true },
  def: { label: 'DEF', percent: false },
  def_percent: { label: 'DEF', percent: true },
  elemental_mastery: { label: 'EM', percent: false },
  energy_recharge: { label: 'ER', percent: true },
  crit_rate: { label: 'CRIT Rate', percent: true },
  crit_dmg: { label: 'CRIT DMG', percent: true },
  healing_bonus: { label: 'Healing', percent: true },
  physical_dmg: { label: 'Physical DMG', percent: true },
  pyro_dmg: { label: 'Pyro DMG', percent: true },
  hydro_dmg: { label: 'Hydro DMG', percent: true },
  electro_dmg: { label: 'Electro DMG', percent: true },
  cryo_dmg: { label: 'Cryo DMG', percent: true },
  anemo_dmg: { label: 'Anemo DMG', percent: true },
  geo_dmg: { label: 'Geo DMG', percent: true },
  dendro_dmg: { label: 'Dendro DMG', percent: true },
} as const satisfies Record<Schemas['StatKey'], StatInfo>

export const SLOTS = {
  flower: 'Flower',
  plume: 'Plume',
  sands: 'Sands',
  goblet: 'Goblet',
  circlet: 'Circlet',
} as const satisfies Record<Schemas['Slot'], string>

export const ELEMENTS = {
  pyro: 'Pyro',
  hydro: 'Hydro',
  electro: 'Electro',
  cryo: 'Cryo',
  anemo: 'Anemo',
  geo: 'Geo',
  dendro: 'Dendro',
} as const satisfies Record<Schemas['Element'], string>

const SHOWCASE_URL = '/api/showcase'

const isNumber = (value: unknown): value is number => typeof value === 'number'
const isString = (value: unknown): value is string => typeof value === 'string'
const isKeyOf = <TTable extends object>(table: TTable, value: unknown): value is keyof TTable =>
  isString(value) && Object.hasOwn(table, value)

const isStat = (value: unknown): value is Stat =>
  isRecord(value) && isKeyOf(STATS, value.key) && isNumber(value.value)

const isWeapon = (value: unknown): value is Weapon =>
  isRecord(value) &&
  isString(value.name) &&
  isNumber(value.rarity) &&
  isNumber(value.level) &&
  isNumber(value.refinement)

const isArtifact = (value: unknown): value is Artifact =>
  isRecord(value) &&
  isKeyOf(SLOTS, value.slot) &&
  isString(value.set_name) &&
  isNumber(value.rarity) &&
  isNumber(value.level) &&
  isStat(value.main) &&
  isArrayOf(value.subs, isStat)

const isCharacter = (value: unknown): value is Character =>
  isRecord(value) &&
  isString(value.name) &&
  (value.element === null || isKeyOf(ELEMENTS, value.element)) &&
  isNumber(value.level) &&
  isNumber(value.constellation) &&
  isArrayOf(value.talents, isNumber) &&
  isArrayOf(value.stats, isStat) &&
  isWeapon(value.weapon) &&
  isArrayOf(value.artifacts, isArtifact)

const isShowcase = (value: unknown): value is Showcase =>
  isRecord(value) &&
  isString(value.uid) &&
  isString(value.nickname) &&
  isNumber(value.adventure_rank) &&
  isArrayOf(value.characters, isCharacter)

export async function fetchShowcase(uid: string): Promise<Showcase> {
  return getJson(`${SHOWCASE_URL}/${encodeURIComponent(uid)}`, isShowcase)
}
