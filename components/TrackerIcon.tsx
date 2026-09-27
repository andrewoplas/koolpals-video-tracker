import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { name: 'check' | 'star' | 'play' | 'arrow' | 'sync' | 'home' | 'settings' | 'chevron' | 'download' | 'library'; filled?: boolean };
export function TrackerIcon({ name, filled = false, ...props }: Props) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {name === 'home' && <path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9" />}
    {name === 'chevron' && <path d="m9 6 6 6-6 6" />}
    {name === 'download' && <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />}
    {name === 'library' && <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 2h8m-6 8 5 3-5 3Z" /></>}
    {name === 'settings' && <><path d="m9 3-.5 2-2 1-2-.5-2 3 1.5 1.5v3L2.5 15l2 3 2-.5 2 1L9 21h6l.5-2.5 2-1 2 .5 2-3-1.5-2v-3L21.5 8l-2-3-2 .5-2-1L15 3Z" /><circle cx="12" cy="12" r="3" /></>}
    {name === 'check'  && <path d="m5 12 4 4L19 6" />}
    {name === 'star' && <path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1 6.2-5.6-3-5.6 3 1-6.2L2.9 9.6l6.3-.9Z" />}
    {name === 'play' && <path d="m9 5 10 7-10 7Z" />}
    {name === 'arrow' && <path d="M5 12h14m-6-6 6 6-6 6" />}
    {name === 'sync' && <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 11-1l3 3M4 15l3 3a7 7 0 0 0 11-1" /></>}
  </svg>;
}
