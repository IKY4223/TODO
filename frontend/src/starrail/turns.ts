// The turn order, as the community has measured it: each unit runs a distance of 10 000 at its
// SPD and acts on reaching the end. An action advance of 25% takes 2 500 off what is left.
import type { Target, TurnEffect } from './effects'

const GAUGE = 10_000
const NEVER = 0
// More actions than any real battle takes: an effect table mistake must not hang the page.
const MAX_ACTIONS = 1000

export interface UnitEffect extends Pick<
  TurnEffect,
  | 'id'
  | 'kind'
  | 'trigger'
  | 'target'
  | 'turns'
  | 'withSummons'
  | 'untilSummonLeaves'
  | 'withoutSummon'
  | 'once'
  | 'stacks'
  | 'cooldown'
  | 'charges'
  | 'duringSummon'
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
  readonly enemy?: boolean
  // Stacks such as Jingliu's Syzygy: one per turn and per Ultimate outside the state; at `enter`
  // the state begins with `bonus` more, and each turn in it spends one until none are left.
  readonly stacks?: { readonly enter: number; readonly bonus: number }
  // For summons:
  readonly later?: boolean // away until a "summon" effect brings it in
  readonly arrival?: number // the action advance it gets each time it is brought in
  readonly maxActions?: number // the most actions it can have in store
  readonly maxSpd?: number // SPD gains stop here
  readonly blocksUltimate?: boolean // its owner cannot use the Ultimate while it is here
  readonly timer?: boolean // a countdown, not a summon: effects on summons skip it
  readonly pausesOwner?: boolean // its owner takes no turn while it is here, and acts once it goes
}

export interface Action {
  readonly time: number // action value from the start of battle
  readonly unit: string
  readonly ultimate: boolean
  readonly turn: number // the unit's own count of turns, from 1
}

interface Buff {
  readonly id: string // a buff gained again replaces the oldest of its kind past its stacks
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
  readonly fired: Set<UnitEffect> // effects that happen once and did
  readonly lastFired: Map<UnitEffect, number> // the turn an effect with a cooldown last fired on
  readonly spent: Map<UnitEffect, number> // charges used since the summon was brought in
  stacks: number
  inState: boolean
  extraTurns: number // extra turns waiting to be taken at once
}

function speedOf({ unit, buffs }: State): number {
  const spd =
    unit.spd + buffs.reduce((sum, buff) => sum + buff.percent * unit.baseSpd + buff.flat, 0)
  // A unit slowed to nothing still crawls: it keeps the order finite.
  return Math.max(1, Math.min(spd, unit.maxSpd ?? spd))
}

const summonsOf = (states: readonly State[], owners: ReadonlySet<string>): State[] =>
  states.filter(({ unit }) => unit.owner !== undefined && owners.has(unit.owner))

function targets(
  states: readonly State[],
  source: State,
  target: Target,
  withSummons = false,
): State[] {
  const characters = states.filter(({ unit }) => !unit.owner && !unit.enemy)
  const sourceCharacter = source.unit.owner ?? source.unit.key
  if (target === 'summons') return summonsOf(states, new Set([sourceCharacter]))
  if (target === 'enemies') return states.filter(({ unit }) => unit.enemy)
  if (target === 'owner') return states.filter(({ unit }) => unit.key === source.unit.owner)
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
  target.spent.clear()
}

/** Whether an effect limited by `once`, a cooldown or charges may fire now; counts it if so. */
function mayFire(source: State, effect: UnitEffect): boolean {
  if (effect.once) {
    if (source.fired.has(effect)) return false
    source.fired.add(effect)
  }
  if (effect.cooldown !== undefined) {
    const last = source.lastFired.get(effect)
    if (last !== undefined && source.turns - last <= effect.cooldown) return false
    source.lastFired.set(effect, source.turns)
  }
  if (effect.charges !== undefined) {
    const spent = source.spent.get(effect) ?? 0
    if (spent >= effect.charges) return false
    source.spent.set(effect, spent + 1)
  }
  return true
}

const away = (states: readonly State[], source: State): boolean =>
  targets(states, source, 'summons').every(({ here }) => !here)

function gain(states: readonly State[], state: State, stacks: number): void {
  const config = state.unit.stacks
  if (!config) return
  state.stacks = Math.min(config.enter + 1 + config.bonus, state.stacks + stacks)
  if (state.inState || state.stacks < config.enter) return
  state.inState = true
  state.stacks += config.bonus
  fire(states, state, 'state')
}

function addBuff(target: State, effect: UnitEffect, until: State | undefined): void {
  const percent =
    effect.kind === 'spd_percent' ? effect.value : effect.kind === 'slow' ? -effect.value : 0
  const flat = effect.kind === 'spd' ? effect.value : 0
  const same = target.buffs.filter(({ id }) => id === effect.id)
  const extra = same.length - (effect.stacks ?? 1) + 1
  if (extra > 0) target.buffs = target.buffs.filter((old) => !same.slice(0, extra).includes(old))
  target.buffs.push({ id: effect.id, percent, flat, left: effect.turns, until })
}

function apply(states: readonly State[], source: State, effect: UnitEffect): void {
  if (effect.withoutSummon && !away(states, source)) return
  if (effect.duringSummon && away(states, source)) return
  if (!effect.value || !mayFire(source, effect)) return
  for (const target of targets(states, source, effect.target, effect.withSummons)) {
    if (effect.kind === 'summon') summon(target, effect.value)
    else if (!target.here) continue
    else if (effect.kind === 'extra') target.extraTurns += 1
    else if (effect.kind === 'stack') gain(states, target, effect.value)
    else if (effect.kind === 'advance')
      target.gauge = Math.max(0, target.gauge - effect.value * GAUGE)
    else if (effect.kind === 'delay') target.gauge += effect.value * GAUGE
    else {
      const until = effect.untilSummonLeaves ? targets(states, source, 'summons')[0] : undefined
      addBuff(target, effect, until)
    }
  }
}

function fire(states: readonly State[], source: State, trigger: UnitEffect['trigger']): void {
  for (const effect of source.unit.effects)
    if (effect.trigger === trigger) apply(states, source, effect)
}

function leave(states: readonly State[], summoned: State): void {
  summoned.here = false
  const owner = states.find(({ unit }) => unit.key === summoned.unit.owner)
  if (owner && summoned.unit.pausesOwner) owner.gauge = 0
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
    fired: new Set(),
    lastFired: new Map(),
    spent: new Map(),
    stacks: 0,
    inState: false,
    extraTurns: 0,
  }))
  for (const state of states) fire(states, state, 'always')
  for (const state of states) fire(states, state, 'start')
  const actions: Action[] = []
  let time = 0
  for (;;) {
    const present = states.filter(({ here }) => here)
    const paused = (state: State): boolean =>
      targets(states, state, 'summons').some(({ here, unit }) => here && unit.pausesOwner)
    const ready = present.filter((state) => state.unit.owner || !paused(state))
    if (!ready.length) return actions // a player may untick the whole team
    // An extra turn comes first, at once, and leaves the unit's place on the gauge as it was.
    const extra = present.find(({ extraTurns }) => extraTurns > 0)
    const next =
      extra ??
      ready.reduce((best, state) =>
        state.gauge / speedOf(state) < best.gauge / speedOf(best) ? state : best,
      )
    const elapsed = extra ? 0 : next.gauge / speedOf(next)
    if (time + elapsed > until || actions.length >= MAX_ACTIONS) return actions
    time += elapsed
    for (const state of present) state.gauge -= speedOf(state) * elapsed
    if (extra) extra.extraTurns -= 1
    else next.gauge = GAUGE
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
    if (next.inState) {
      next.stacks -= 1
      if (next.stacks <= 0) next.inState = false
    } else {
      gain(states, next, 1)
    }
    fire(states, next, next.unit.owner ? 'summon' : 'turn')
    if (ultimate) {
      fire(states, next, 'ultimate')
      gain(states, next, 1)
    }
  }
}
