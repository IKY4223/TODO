import { type JSX, useState } from 'react'
import { type Message, useT } from '../i18n'
import { SCRIPTS } from './link-scripts'

// The first step is the game's, quoted from the README of the open source tracker each script
// follows (biuuu/genshin-wish-export and biuuu/star-rail-warp-export, docs/README_EN.md): the
// history page writes its link into the game's cache. The rest is how to run this site's script.
const OPEN: Readonly<Record<keyof typeof SCRIPTS, Message>> = {
  genshin: 'Open the wish history of the game',
  starrail: 'Open the warp details page of the game',
}
const STEPS: readonly Message[] = [
  'On the PC, open Windows PowerShell: press Win+X and choose Windows PowerShell, or Terminal on Windows 11',
  'Copy the script below, paste it into PowerShell and press Enter',
  'It prints the link and copies it: paste it into the box below',
]

/** How to find the history link on a PC, with the script that finds it, shown in full. */
export function PcScript({ game }: { readonly game: keyof typeof SCRIPTS }): JSX.Element {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const script = SCRIPTS[game]
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
    } catch {
      // The browser refused the clipboard: the script below can still be selected and copied.
    }
  }
  return (
    <details>
      <summary>{t('On a PC (Windows)')}</summary>
      <ol>
        {[OPEN[game], ...STEPS].map((step) => (
          <li key={step}>{t(step)}</li>
        ))}
      </ol>
      <p className="hint">
        {t(
          "The script reads the game's log and web cache and prints the link. It sends nothing over the network and changes no file. Read it before you run it.",
        )}
      </p>
      <button type="button" className="secondary" onClick={() => void copy()}>
        {t(copied ? 'Copied' : 'Copy the script')}
      </button>
      <pre className="script">
        <code>{script}</code>
      </pre>
    </details>
  )
}
