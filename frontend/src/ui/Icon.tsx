import type { JSX } from 'react'

/** Decorative: the name is always printed next to the picture. */
export function Icon(props: { readonly src: string | null; readonly size: number }): JSX.Element | null {
  const { src, size } = props
  return src ? <img src={src} alt="" width={size} height={size} loading="lazy" /> : null
}
