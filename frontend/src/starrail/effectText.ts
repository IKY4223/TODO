import type { Translate } from '../i18n'
import { numberFormat } from '../i18n'
import type { BonusStat, Source, StatEffect, Target, Trigger, TurnEffect } from './effects'
import { valueFor } from './effects'
import { type StarRailCharacter, STATS } from './starrail'

const percent = numberFormat({ style: 'percent', maximumFractionDigits: 1 })
const plain = numberFormat({ maximumFractionDigits: 1 })

/** The light cone, set or character an effect comes from, as the player knows it. */
export function sourceName(source: Source, character: StarRailCharacter): string {
  if ('character' in source) return character.name
  if ('cone' in source) return character.light_cone?.name ?? ''
  const relic = character.relics.find(({ set_id }) => set_id === source.set)
  return `${relic?.set_name ?? ''} (${source.pieces})`
}

// "ATK +12%", as the game words it: the % on the value says it is a share.
const bonusName = (stat: BonusStat, t: Translate): string =>
  t(stat === 'spd_percent' ? 'SPD' : STATS[stat].label)

/** "Outgoing Healing +12% / +20% · at SPD 135 / 180" */
export function statEffectText(
  effect: StatEffect,
  character: StarRailCharacter,
  t: Translate,
): string {
  return effect.bonuses
    .map((bonus) => {
      const tiers = bonus.spdAtLeast ?? bonus.spdBelow
      const own = valueFor(effect.source, bonus.values, character) ?? bonus.values[0] ?? 0
      const values = tiers ? bonus.values : [own]
      const gains = values.map((value) => `+${percent.format(value)}`).join(' / ')
      const condition = bonus.spdAtLeast
        ? ` · ${t('at SPD {tiers}', { tiers: bonus.spdAtLeast.join(' / ') })}`
        : bonus.spdBelow
          ? ` · ${t('below SPD {tiers}', { tiers: bonus.spdBelow.join(' / ') })}`
          : ''
      return `${bonusName(bonus.stat, t)} ${gains}${condition}`
    })
    .join(', ')
}

const TRIGGERS = {
  start: 'At battle start',
  turn: 'Every turn',
  ultimate: 'On Ultimate',
  always: 'Always',
  summon: "On the memosprite's turn",
} as const satisfies Record<Trigger, Parameters<Translate>[0]>

const TARGETS = {
  self: 'Self',
  allies: 'All allies',
  teammates: 'Teammates',
  chosen: 'Chosen ally',
} as const satisfies Record<Target, Parameters<Translate>[0]>

/** "On Ultimate · All allies: SPD +12% · lasts 1 turn(s)" */
export function turnEffectText(effect: TurnEffect, value: number, t: Translate): string {
  const amount = effect.kind === 'spd' ? plain.format(value) : percent.format(value)
  const what =
    effect.kind === 'advance'
      ? t('action advance +{value}', { value: amount })
      : t('SPD +{value}', { value: amount })
  const lasting = effect.turns ? ` · ${t('lasts {turns} turn(s)', { turns: effect.turns })}` : ''
  const needs = effect.minSpd ? ` · ${t('SPD at least {spd}', { spd: effect.minSpd })}` : ''
  return `${t(TRIGGERS[effect.trigger])} · ${t(TARGETS[effect.target])}: ${what}${lasting}${needs}`
}
