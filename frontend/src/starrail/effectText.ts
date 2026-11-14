import type { Translate } from '../i18n'
import { numberFormat } from '../i18n'
import type { BonusStat, Source, StatEffect, Target, Trigger, TurnEffect } from './effects'
import { valueFor } from './effects'
import { type StarRailCharacter, STATS } from './starrail'

const percent = numberFormat({ style: 'percent', maximumFractionDigits: 1 })
const plain = numberFormat({ maximumFractionDigits: 1 })

/** The light cone, set or character an effect comes from, as the player knows it. */
export function sourceName(source: Source, character: StarRailCharacter, t: Translate): string {
  if ('character' in source) return character.name
  if ('cone' in source) return character.light_cone?.name ?? ''
  const relic = character.relics.find(({ set_id }) => set_id === source.set)
  if (!source.teammate) return `${relic?.set_name ?? ''} (${source.pieces})`
  const set = TEAM_SETS[source.set]
  return t('{set} on a teammate', { set: set ? t(set) : '' })
}

// The sets a teammate can wear for everyone: the character's own relics do not name them.
const TEAM_SETS: Partial<Record<number, 'Fleet of the Ageless' | 'Broken Keel'>> = {
  302: 'Fleet of the Ageless',
  310: 'Broken Keel',
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
      const tiers = bonus.atLeast ?? bonus.below
      const own = valueFor(effect.source, bonus.values, character) ?? bonus.values[0] ?? 0
      const values = tiers ? bonus.values : [own]
      const gains = values.map((value) => `+${percent.format(value)}`).join(' / ')
      const condition = bonus.tierStat
        ? ` · ${t('at Effect RES {tiers}', { tiers: bonus.atLeast?.map((tier) => percent.format(tier)).join(' / ') ?? '' })}`
        : bonus.atLeast
          ? ` · ${t('at SPD {tiers}', { tiers: bonus.atLeast.join(' / ') })}`
          : bonus.below
            ? ` · ${t('below SPD {tiers}', { tiers: bonus.below.join(' / ') })}`
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
  state: 'On entering its state',
} as const satisfies Record<Trigger, Parameters<Translate>[0]>

const TARGETS = {
  self: 'Self',
  allies: 'All allies',
  teammates: 'Teammates',
  chosen: 'Chosen ally',
  summons: 'Own summon',
  owner: 'Its owner',
  enemies: 'Enemies',
} as const satisfies Record<Target, Parameters<Translate>[0]>

/** "On Ultimate · All allies: SPD +12% · lasts 1 turn(s)" */
/** What a turn effect does; `chance` is a debuff's base chance to land, from chanceOf. */
export function turnEffectText(
  effect: TurnEffect,
  value: number,
  t: Translate,
  chance?: number,
): string {
  const amount = ['spd', 'summon', 'stack'].includes(effect.kind)
    ? plain.format(value)
    : percent.format(value)
  const what = {
    advance: t('action advance +{value}', { value: amount }),
    spd: t('SPD +{value}', { value: amount }),
    spd_percent: t('SPD +{value}', { value: amount }),
    summon: effect.stays ? t('comes in') : t('comes in with {value} action(s)', { value: amount }),
    delay: t('action delay +{value}', { value: amount }),
    slow: t('SPD −{value}', { value: amount }),
    stack: t('{value} stack(s)', { value: amount }),
    extra: t('one extra turn'),
  }[effect.kind]
  const notes = [
    effect.turns ? t('lasts {turns} turn(s)', { turns: effect.turns }) : '',
    effect.untilSummonLeaves ? t('until its countdown acts') : '',
    effect.withoutSummon ? t('outside its state') : '',
    effect.minSpd ? t('SPD at least {spd}', { spd: effect.minSpd }) : '',
    effect.once ? t('once') : '',
    effect.cooldown ? t('again after {turns} turn(s)', { turns: effect.cooldown }) : '',
    effect.charges ? t('{count} time(s) each time it comes', { count: effect.charges }) : '',
    effect.duringSummon ? t('in its state') : '',
    effect.eidolon ? t('from Eidolon {eidolon}', { eidolon: effect.eidolon }) : '',
    effect.byElation ? t('by Elation characters on the team') : '',
    chance === undefined
      ? ''
      : t('lands at a base chance of {chance}', { chance: percent.format(chance) }),
  ]
    .filter(Boolean)
    .map((note) => ` · ${note}`)
    .join('')
  const target = effect.countdown ? t('Own countdown') : t(TARGETS[effect.target])
  return `${t(TRIGGERS[effect.trigger])} · ${target}: ${what}${notes}`
}
