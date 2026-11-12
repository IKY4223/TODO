import { getJson, isArrayOf, isKeyOf, isNumber, isRecord, isString } from '../api/http'
import type { components } from '../api/schema'
import type { Language, Message, Translate } from '../i18n'

type Schemas = components['schemas']
export type StarRailShowcase = Schemas['StarRailShowcase']
export type StarRailCharacter = Schemas['StarRailCharacter']
export type Relic = Schemas['Relic']
type LightCone = Schemas['LightCone']
type Stat = Schemas['StarRailStat']
type SubStat = Schemas['SubStat']
type Skill = Schemas['Skill']
type AccountRecord = Schemas['AccountRecord']

interface StatInfo {
  readonly label: Message
  /** How the game prints it: whole numbers, one decimal (SPD), or a percent of a fraction. */
  readonly format: 'whole' | 'decimal' | 'percent'
}

// `satisfies` makes a stat, slot, element or path added to the API a compile error here.
export const STATS = {
  hp: { label: 'HP', format: 'whole' },
  hp_percent: { label: 'HP', format: 'percent' },
  atk: { label: 'ATK', format: 'whole' },
  atk_percent: { label: 'ATK', format: 'percent' },
  def: { label: 'DEF', format: 'whole' },
  def_percent: { label: 'DEF', format: 'percent' },
  spd: { label: 'SPD', format: 'decimal' },
  crit_rate: { label: 'CRIT Rate', format: 'percent' },
  crit_dmg: { label: 'CRIT DMG', format: 'percent' },
  effect_hit_rate: { label: 'Effect Hit Rate', format: 'percent' },
  effect_res: { label: 'Effect RES', format: 'percent' },
  break_effect: { label: 'Break Effect', format: 'percent' },
  energy_regen: { label: 'Energy Regen', format: 'percent' },
  outgoing_healing: { label: 'Outgoing Healing', format: 'percent' },
  physical_dmg: { label: 'Physical DMG', format: 'percent' },
  fire_dmg: { label: 'Fire DMG', format: 'percent' },
  ice_dmg: { label: 'Ice DMG', format: 'percent' },
  lightning_dmg: { label: 'Lightning DMG', format: 'percent' },
  wind_dmg: { label: 'Wind DMG', format: 'percent' },
  quantum_dmg: { label: 'Quantum DMG', format: 'percent' },
  imaginary_dmg: { label: 'Imaginary DMG', format: 'percent' },
} as const satisfies Record<Schemas['StarRailStatKey'], StatInfo>

/** "HP" names two stats; the percent one says so. */
export const statName = (key: keyof typeof STATS, t: Translate): string =>
  key.endsWith('_percent') ? `${t(STATS[key].label)} %` : t(STATS[key].label)

export const SLOTS = {
  head: 'Head',
  hands: 'Hands',
  body: 'Body',
  feet: 'Feet',
  sphere: 'Planar Sphere',
  rope: 'Link Rope',
} as const satisfies Record<Schemas['StarRailSlot'], Message>

export const ELEMENTS = {
  physical: 'Physical',
  fire: 'Fire',
  ice: 'Ice',
  lightning: 'Lightning',
  wind: 'Wind',
  quantum: 'Quantum',
  imaginary: 'Imaginary',
} as const satisfies Record<Schemas['StarRailElement'], Message>

export const PATHS = {
  destruction: 'Destruction',
  hunt: 'The Hunt',
  erudition: 'Erudition',
  harmony: 'Harmony',
  nihility: 'Nihility',
  preservation: 'Preservation',
  abundance: 'Abundance',
  remembrance: 'Remembrance',
  elation: 'Elation',
} as const satisfies Record<Schemas['Path'], Message>

export const SKILLS = {
  basic: 'Basic ATK',
  skill: 'Skill',
  ultimate: 'Ultimate',
  talent: 'Talent',
  elation: 'Elation',
  memosprite_skill: 'Memosprite Skill',
  memosprite_talent: 'Memosprite Talent',
} as const satisfies Record<Schemas['SkillKind'], Message>

const SHOWCASE_URL = '/api/starrail/showcase'

const FORMATS = {
  whole: new Intl.NumberFormat('en', { maximumFractionDigits: 0 }),
  decimal: new Intl.NumberFormat('en', { maximumFractionDigits: 1 }),
  percent: new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }),
} as const satisfies Record<StatInfo['format'], Intl.NumberFormat>

export const formatValue = ({ key, value }: Stat): string =>
  FORMATS[STATS[key].format].format(value)

export const formatStat = (stat: Stat, t: Translate): string =>
  `${t(STATS[stat.key].label)} ${formatValue(stat)}`

const isNullable =
  <TValue>(isValue: (value: unknown) => value is TValue) =>
  (value: unknown): value is TValue | null =>
    value === null || isValue(value)

const isIcon = isNullable(isString)

const isStat = (value: unknown): value is Stat =>
  isRecord(value) && isKeyOf(STATS, value.key) && isNumber(value.value)

const isSubStat = (value: unknown): value is SubStat =>
  isRecord(value) &&
  isKeyOf(STATS, value.key) &&
  isNumber(value.value) &&
  isNumber(value.rolls) &&
  isNumber(value.score)

const isLightCone = (value: unknown): value is LightCone =>
  isRecord(value) &&
  isString(value.name) &&
  isNumber(value.rarity) &&
  isNumber(value.level) &&
  isNumber(value.superimposition) &&
  isIcon(value.icon)

const isRelic = (value: unknown): value is Relic =>
  isRecord(value) &&
  isKeyOf(SLOTS, value.slot) &&
  isString(value.set_name) &&
  isNumber(value.rarity) &&
  isNumber(value.level) &&
  isStat(value.main) &&
  isArrayOf(value.subs, isSubStat) &&
  isIcon(value.icon)

const isSkill = (value: unknown): value is Skill =>
  isRecord(value) && isKeyOf(SKILLS, value.kind) && isNumber(value.level) && isNumber(value.bonus)

const isTracePoint = (value: unknown): value is Schemas['TracePoint'] =>
  isRecord(value) && isNumber(value.id) && isNumber(value.level)

const isAccountRecord = (value: unknown): value is AccountRecord =>
  isRecord(value) &&
  isNumber(value.achievements) &&
  isNumber(value.characters) &&
  isNumber(value.light_cones) &&
  isNumber(value.relics)

const isCharacter = (value: unknown): value is StarRailCharacter =>
  isRecord(value) &&
  isNumber(value.id) &&
  isString(value.name) &&
  (value.element === null || isKeyOf(ELEMENTS, value.element)) &&
  (value.path === null || isKeyOf(PATHS, value.path)) &&
  isNullable(isNumber)(value.rarity) &&
  isNumber(value.level) &&
  isNumber(value.eidolon) &&
  isNullable(isLightCone)(value.light_cone) &&
  isArrayOf(value.relics, isRelic) &&
  isArrayOf(value.skills, isSkill) &&
  isArrayOf(value.points, isTracePoint) &&
  isIcon(value.icon)

const isShowcase = (value: unknown): value is StarRailShowcase =>
  isRecord(value) &&
  isString(value.uid) &&
  isString(value.nickname) &&
  isString(value.signature) &&
  isIcon(value.avatar) &&
  isNumber(value.trailblaze_level) &&
  isNumber(value.equilibrium_level) &&
  isNullable(isAccountRecord)(value.record) &&
  isArrayOf(value.characters, isCharacter)

export async function fetchStarRailShowcase(
  uid: string,
  language: Language,
): Promise<StarRailShowcase> {
  return getJson(`${SHOWCASE_URL}/${encodeURIComponent(uid)}?lang=${language}`, isShowcase)
}
