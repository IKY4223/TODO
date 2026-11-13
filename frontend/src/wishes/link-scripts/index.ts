import genshin from './genshin.ps1?raw'
import starrail from './starrail.ps1?raw'

/** The scripts that find a history link on a PC, as text; test.ps1 runs them in CI on Windows. */
export const SCRIPTS = { genshin, starrail } as const
