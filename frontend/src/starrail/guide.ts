import { getJson, isArrayOf, isNumber, isRecord, isString } from '../api/http'
import type { components } from '../api/schema'
import type { Language } from '../i18n'
import { SKILLS } from './starrail'

type Schemas = components['schemas']
export type CharacterTexts = Schemas['CharacterGuide']
export type Trace = Schemas['Trace']
export type SkillText = Schemas['SkillText']

const TEXTS_URL = '/api/starrail/characters'
const PERCENT = 100
// "#1[i]%": the first number, whole, as a percent. "#2[f1]": the second, to one decimal.
const PLACEHOLDER = /#(\d+)\[(i|f1|f2)\](%?)/g
const DIGITS = { i: 0, f1: 1, f2: 2 } as const
const UNKNOWN = '?'

/** The description with a level's numbers in place. A number the data lacks reads "?". */
export const describe = (description: string, numbers: readonly number[]): string =>
  description.replaceAll(
    PLACEHOLDER,
    (_, index: string, format: keyof typeof DIGITS, percent: string) => {
      const number = numbers[Number(index) - 1]
      if (number === undefined) return UNKNOWN + percent
      const shown = (percent ? number * PERCENT : number).toFixed(DIGITS[format])
      return String(Number(shown)) + percent // through Number: "50.0" reads "50"
    },
  )

const isSkillText = (value: unknown): value is SkillText =>
  isRecord(value) &&
  (value.kind === null || (isString(value.kind) && Object.hasOwn(SKILLS, value.kind))) &&
  isString(value.label) &&
  isString(value.name) &&
  isString(value.description) &&
  isArrayOf(value.params, (level): level is number[] => isArrayOf(level, isNumber))

const isCost = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every(isNumber)

const isTrace = (value: unknown): value is Trace =>
  isRecord(value) &&
  isNumber(value.id) &&
  isString(value.name) &&
  typeof value.skill === 'boolean' &&
  isString(value.description) &&
  isArrayOf(value.params, isNumber) &&
  isArrayOf(value.costs, isCost)

/** What is still to pay to max every trace: item id -> amount, in the order first met. */
export function remainingCosts(
  traces: readonly Trace[],
  points: readonly { readonly id: number; readonly level: number }[],
): Map<string, number> {
  const total = new Map<string, number>()
  for (const trace of traces) {
    // costs[n] is the price of going from level n to n + 1; a locked point is at level 0.
    const level = points.find(({ id }) => id === trace.id)?.level ?? 0
    for (const cost of trace.costs.slice(level)) {
      for (const [item, amount] of Object.entries(cost)) {
        total.set(item, (total.get(item) ?? 0) + amount)
      }
    }
  }
  return total
}

const isCharacterTexts = (value: unknown): value is CharacterTexts =>
  isRecord(value) &&
  isArrayOf(value.skills, isSkillText) &&
  isArrayOf(value.traces, isTrace) &&
  isRecord(value.items) &&
  Object.values(value.items).every(isString) &&
  isArrayOf(
    value.eidolons,
    (eidolon): eidolon is Schemas['EidolonText'] =>
      isRecord(eidolon) && isString(eidolon.name) && isString(eidolon.description),
  )

export async function fetchCharacterTexts(id: number, language: Language): Promise<CharacterTexts> {
  return getJson(`${TEXTS_URL}/${id}?lang=${language}`, isCharacterTexts)
}
