import genshin from './genshin.ps1?raw'
import starrail from './starrail.ps1?raw'

// They look where the open source exporters biuuu/genshin-wish-export and
// biuuu/star-rail-warp-export (MIT licence) do, in src/main/getData.js; nothing was copied.
/** The scripts that find a history link on a PC, as text; test.ps1 runs them in CI on Windows. */
export const SCRIPTS = { genshin, starrail } as const
