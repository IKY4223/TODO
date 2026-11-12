// The turn order, as the community has measured it: each unit runs a distance of 10 000 at its
// SPD and acts on reaching the end. An action advance of 25% takes 2 500 off what is left.
import type { Target, TurnEffect } from './effects'

const GAUGE = 10_000
const NEVER = 0

export interface UnitEffect extends Pick<
  TurnEffect,
  'kind' | 'trigger' | 'target' | 'turns' | 'withSummons'
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
}

export interface Action {
  readonly time: number // action value from the start of battle
  readonly unit: string
  readonly ultimate: boolean
}

interface Buff {
  readonly percent: number
  readonly flat: number
  left: number | undefined // the bearer's turns still to come; undefined: for good
}

interface State {
  readonly unit: Unit
  gauge: number // distance still to run
  turns: number
  readonly buffs: Buff[]
}

const speedOf = ({ unit, buffs }: State): number =>
  unit.spd + buffs.reduce((sum, buff) => sum + buff.percent * unit.baseSpd + buff.flat, 0)

function targets(
  states: readonly State[],
  source: State,
  target: Target,
  withSummons = false,
): State[] {
  const characters = states.filter(({ unit }) => !unit.owner)
  const sourceCharacter = source.unit.owner ?? source.unit.key
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
  return [...picked, ...states.filter(({ unit }) => unit.owner && owners.has(unit.owner))]
}

function apply(states: readonly State[], source: State, effect: UnitEffect): void {
  for (const target of targets(states, source, effect.target, effect.withSummons)) {
    if (effect.kind === 'advance') {
      target.gauge = Math.max(0, target.gauge - effect.value * GAUGE)
    } else {
      const percent = effect.kind === 'spd_percent' ? effect.value : 0
      const flat = effect.kind === 'spd' ? effect.value : 0
      target.buffs.push({ percent, flat, left: effect.turns })
    }
  }
}

function fire(states: readonly State[], source: State, trigger: UnitEffect['trigger']): void {
  for (const effect of source.unit.effects)
    if (effect.trigger === trigger) apply(states, source, effect)
}

/** Every action taken until `until` action value, in order. Ties go to the unit listed first. */
export function simulate(units: readonly Unit[], until: number): Action[] {
  const states: State[] = units.map((unit) => ({ unit, gauge: GAUGE, turns: 0, buffs: [] }))
  for (const state of states) fire(states, state, 'always')
  for (const state of states) fire(states, state, 'start')
  const actions: Action[] = []
  if (!states.length) return actions // a player may untick the whole team
  let time = 0
  for (;;) {
    const next = states.reduce((best, state) =>
      state.gauge / speedOf(state) < best.gauge / speedOf(best) ? state : best,
    )
    const elapsed = next.gauge / speedOf(next)
    if (time + elapsed > until) return actions
    time += elapsed
    for (const state of states) state.gauge -= speedOf(state) * elapsed
    next.gauge = GAUGE
    next.turns += 1
    // shortcut: a buff wears off at the end of its bearer's turn, the one it was gained on
    // included only when gained before that turn.
    for (const buff of next.buffs) if (buff.left !== undefined) buff.left -= 1
    next.buffs.splice(
      0,
      next.buffs.length,
      ...next.buffs.filter(({ left }) => left === undefined || left > 0),
    )
    const { ultimateEvery } = next.unit
    const ultimate = ultimateEvery !== NEVER && next.turns % ultimateEvery === 0
    actions.push({ time, unit: next.unit.key, ultimate })
    fire(states, next, next.unit.owner ? 'summon' : 'turn')
    if (ultimate) fire(states, next, 'ultimate')
  }
}
