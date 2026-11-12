// How turns work, as the community has measured it: a character acts every 10 000 / SPD action
// value. In Memory of Chaos the first cycle lasts 150 action value and each one after it 100.
const ACTION_GAUGE = 10_000
const FIRST_CYCLE = 150
const LATER_CYCLE = 100
// Action values are compared exactly in the game; this keeps float noise from losing a turn.
const TOLERANCE = 1e-9

/** Action value from the start of the battle to the end of `cycle` (0 is the first). */
const elapsed = (cycle: number): number => FIRST_CYCLE + LATER_CYCLE * cycle

/** Turns a character with `speed` takes from the start to the end of `cycle`. */
export const actionsBy = (speed: number, cycle: number): number =>
  Math.floor((elapsed(cycle) * speed) / ACTION_GAUGE + TOLERANCE)

/** The SPD to take one more turn by the end of `cycle`. */
export const nextBreakpoint = (speed: number, cycle: number): number =>
  ((actionsBy(speed, cycle) + 1) * ACTION_GAUGE) / elapsed(cycle)
