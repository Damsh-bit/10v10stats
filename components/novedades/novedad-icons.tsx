import {
  BarChart3,
  Coins,
  Crown,
  Flame,
  Gauge,
  Heart,
  History,
  Image as ImageIcon,
  ListOrdered,
  Medal,
  Megaphone,
  Palette,
  Scale,
  ShieldCheck,
  Signpost,
  Smartphone,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserRound,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { NovedadIcon, NovedadTag } from '@/lib/novedades'
import { FaceitLevel } from '@/components/faceit/faceit-bits'

const HIGHLIGHT_ICONS: Record<Exclude<NovedadIcon, 'faceit'>, { icon: LucideIcon; className: string }> = {
  flame: { icon: Flame, className: 'text-orange-400' },
  swords: { icon: Swords, className: 'text-brand' },
  scale: { icon: Scale, className: 'text-emerald-300' },
  chart: { icon: BarChart3, className: 'text-sky-300' },
  coins: { icon: Coins, className: 'text-amber-300' },
  wallet: { icon: Wallet, className: 'text-sky-300' },
  trophy: { icon: Trophy, className: 'text-yellow-300' },
  sparkles: { icon: Sparkles, className: 'text-amber-300' },
  crown: { icon: Crown, className: 'text-yellow-400' },
  history: { icon: History, className: 'text-violet-300' },
  phone: { icon: Smartphone, className: 'text-teal-300' },
  wrench: { icon: Wrench, className: 'text-slate-300' },
  image: { icon: ImageIcon, className: 'text-pink-300' },
  user: { icon: UserRound, className: 'text-violet-300' },
  list: { icon: ListOrdered, className: 'text-sky-300' },
  medal: { icon: Medal, className: 'text-amber-300' },
  megaphone: { icon: Megaphone, className: 'text-brand' },
  shield: { icon: ShieldCheck, className: 'text-emerald-300' },
  target: { icon: Target, className: 'text-rose-300' },
  heart: { icon: Heart, className: 'text-pink-400' },
  zap: { icon: Zap, className: 'text-amber-300' },
}

export function HighlightIcon({ icon }: { icon: NovedadIcon }) {
  if (icon === 'faceit') return <FaceitLevel level={8} size={20} />
  const { icon: Icon, className } = HIGHLIGHT_ICONS[icon] ?? HIGHLIGHT_ICONS.sparkles
  return <Icon className={`h-4 w-4 ${className}`} aria-hidden="true" />
}

/** Ícono y color de cada sección, para la línea de tiempo de /novedades. */
export const TAG_STYLES: Record<NovedadTag, { icon: LucideIcon; chip: string; node: string }> = {
  Reglas: { icon: Crown, chip: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300', node: 'bg-yellow-400/15 text-yellow-300 ring-yellow-400/40' },
  Partidas: { icon: Swords, chip: 'border-brand/40 bg-brand/10 text-brand', node: 'bg-brand/15 text-brand ring-brand/40' },
  'Estadísticas': { icon: BarChart3, chip: 'border-sky-400/40 bg-sky-400/10 text-sky-300', node: 'bg-sky-400/15 text-sky-300 ring-sky-400/40' },
  Temporadas: { icon: Sparkles, chip: 'border-amber-300/40 bg-amber-300/10 text-amber-200', node: 'bg-amber-300/15 text-amber-200 ring-amber-300/40' },
  Perfiles: { icon: UserRound, chip: 'border-violet-400/40 bg-violet-400/10 text-violet-300', node: 'bg-violet-400/15 text-violet-300 ring-violet-400/40' },
  FACEIT: { icon: Gauge, chip: 'border-orange-500/40 bg-orange-500/10 text-orange-400', node: 'bg-orange-500/15 text-orange-400 ring-orange-500/40' },
  'Generador de equipos': { icon: Scale, chip: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300', node: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/40' },
  Cartel: { icon: Signpost, chip: 'border-orange-400/40 bg-orange-400/10 text-orange-300', node: 'bg-orange-400/15 text-orange-300 ring-orange-400/40' },
  Apuestas: { icon: Coins, chip: 'border-amber-400/40 bg-amber-400/10 text-amber-300', node: 'bg-amber-400/15 text-amber-300 ring-amber-400/40' },
  'Diseño': { icon: Palette, chip: 'border-pink-400/40 bg-pink-400/10 text-pink-300', node: 'bg-pink-400/15 text-pink-300 ring-pink-400/40' },
  Celular: { icon: Smartphone, chip: 'border-teal-400/40 bg-teal-400/10 text-teal-300', node: 'bg-teal-400/15 text-teal-300 ring-teal-400/40' },
  Arreglos: { icon: Wrench, chip: 'border-slate-400/40 bg-slate-400/10 text-slate-300', node: 'bg-slate-400/15 text-slate-300 ring-slate-400/40' },
  Sitio: { icon: Megaphone, chip: 'border-brand/40 bg-brand/10 text-brand', node: 'bg-brand/15 text-brand ring-brand/40' },
}
