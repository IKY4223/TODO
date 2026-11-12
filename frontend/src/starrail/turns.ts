// The turn order, as the community has measured it: each unit runs a distance of 10 000 at its
// SPD and acts on reaching the end. An action advance of 25% takes 2 500 off what is left.
import type { Target, TurnEffect } from './effects'

const GAUGE = 10_000
const NEVER = 0

export interface UnitEffect extends Pick<
  TurnEffect,
  'kind' | 'trigger' | 'target' | 'turns' | 'withSummons' | 'untilSummonLeaves' | 'withoutSummon'
> {
  readonly value: number
}

export interface Unit {
  readonly key: string
  readonly spd: number // as the character screen shows it
  readonly baseSpd: number // what a SPD % buff is a share of
  readonly owner?: string // the character a summon belongs to
  readonly ultimateEvery: number // the Ultimate after every this many turns; 0: never
  readonly chosen?: string // the ally a "chosen" effect goes to
  readonly effects: readonly UnitEffect[]
  // For summons:
  readonly later?: boolean // away until a "summon" effect brings it in
  readonly arrival?: number // the action advance it gets each time it is brought in
  readonly maxActions?: number // the most actions it can have in store
  readonly maxSpd?: number // SPD gains stop here
  readonly blocksUltimate?: boolean // its owner cannot use the Ultimate while it is here
  readonly timer?: boolean // a countdown, not a summon: effects on summons skip it
}

export interface Action {
  readonly time: number // action value from the start of battle
  readonly unit: string
  readonly ultimate: boolean
  readonly turn: number // the unit's own count of turns, from 1
}

interface Buff {
  readonly percent: number
  readonly flat: number
  left: number | undefined // the bearer's turns still to come; undefined: for good
  readonly until?: State // ends when this summon leaves
}

interface State {
  readonly unit: Unit
  gauge: number // distance still to run
  turns: number
  sinceUltimate: number // turns since the last Ultimate
  here: boolean
  actions: number | undefined // actions left before a summon leaves; undefined: no limit
  buffs: Buff[]
}

function speedOf({ unit, buffs }: State): number {
  const spd = unit.spd + buffs.reduce((sum, buff) => sum + buff.percent * unit.baseSpd + buff.flat, 0)
  return Math.min(spd, unit.maxSpd ?? spd)
}

const summonsOf = (states: readonly State[], owners: ReadonlySet<string>): State[] =>
  states.filter(({ unit }) => unit.owner !== undefined && owners.has(unit.owner))

function targets(
  states: readonly State[],
  source: State,
  target: Target,
  withSummons = false,
): State[] {
  const characters = states.filter(({ unit }) => !unit.owner)
  const sourceCharacter = source.unit.owner ?? source.unit.key
  if (target === 'summons') return summonsOf(states, new Set([sourceCharacter]))
  const picked = {
    self: [source],
    allies: characters,
    teammates: characters.filter(({ unit }) => unit.key !== sourceCharacter),
    chosen: characters.filter(
      ({ unit }) =>
        unit.key === states.find((state) => state.unit.key === sourceCharacter)?.unit.chosen,
    ),
  }[target]
  if (!withSummons) return picked
  const owners = new Set(picked.map(({ unit }) => unit.key))
  return [...picked, ...summonsOf(states, owners).filter(({ unit }) => !unit.timer)]
}

function summon(target: State, actions: number): void {
  const { maxActions = Infinity } = target.unit
  if (target.here) {
    target.actions = Math.min(maxActions, (target.actions ?? 0) + actions)
    return
  }
  target.here = true
  target.gauge = GAUGE * (1 - (target.unit.arrival ?? 0))
  target.actions = Math.min(maxActions, actions)
}

const away = (states: readonly State[], source: State): boolean =>
  targets(states, source, 'summons').every(({ here }) => !here)

function apply(states: readonly State[], source: State, effect: UnitEffect): void {
  if (effect.withoutSummon && !away(states, source)) return
  for (const target of targets(states, source, effect.target, effect.withSummons)) {
    if (effect.kind === 'summon') {
      summon(target, effect.value)
    } else if (!target.here) {
      continue
    } else if (effect.kind === 'advance') {
      target.gauge = Math.max(0, target.gauge - effect.value * GAUGE)
    } else {
      const percent = effect.kind === 'spd_percent' ? effect.value : 0
      const flat = effect.kind === 'spd' ? effect.value : 0
      const until = effect.untilSummonLeaves ? targets(states, source, 'summons')[0] : undefined
      target.buffs.push({ percent, flat, left: effect.turns, until })
    }
  }
}

function fire(states: readonly State[], source: State, trigger: UnitEffect['trigger']): void {
  for (const effect of source.unit.effects)
    if (effect.trigger === trigger) apply(states, source, effect)
}

function leave(states: readonly State[], summoned: State): void {
  summoned.here = false
  for (const state of states) state.buffs = state.buffs.filter(({ until }) => until !== summoned)
}

/** Every action taken until `until` action value, in order. Ties go to the unit listed first. */
export function simulate(units: readonly Unit[], until: number): Action[] {
  const states: State[] = units.map((unit) => ({
    unit,
    gauge: GAUGE,
    turns: 0,
    sinceUltimate: 0,
    here: !unit.later,
    actions: undefined,
    buffs: [],
  }))
  for (const state of states) fire(states, state, 'always')
  for (const state of states) fire(states, state, 'start')
  const actions: Action[] = []
  let time = 0
  for (;;) {
    const present = states.filter(({ here }) => here)
    if (!present.length) return actions // a player may untick the whole team
    const next = present.reduce((best, state) =>
      state.gauge / speedOf(state) < best.gauge / speedOf(best) ? state : best,
    )
    const elapsed = next.gauge / speedOf(next)
    if (time + elapsed > until) return actions
    time += elapsed
    for (const state of present) state.gauge -= speedOf(state) * elapsed
    next.gauge = GAUGE
    next.turns += 1
    next.sinceUltimate += 1
    // shortcut: a buff wears off at the end of its bearer's turn, the one it was gained on
    // included only when gained before that turn.
    for (const buff of next.buffs) if (buff.left !== undefined) buff.left -= 1
    next.buffs = next.buffs.filter(({ left }) => left === undefined || left > 0)
    const { ultimateEvery } = next.unit
    const blocked = targets(states, next, 'summons').some(
      ({ here, unit }) => here && unit.blocksUltimate,
    )
    const ultimate = ultimateEvery !== NEVER && next.sinceUltimate >= ultimateEvery && !blocked
    if (ultimate) next.sinceUltimate = 0
    actions.push({ time, unit: next.unit.key, ultimate, turn: next.turns })
    if (next.actions !== undefined) {
      next.actions -= 1
      if (next.actions <= 0) leave(states, next)
    }
    if (next.unit.timer) continue // a countdown only marks the end of its owner's state
    fire(states, next, next.unit.owner ? 'summon' : 'turn')
    if (ultimate) fire(states, next, 'ultimate')
  }
}
