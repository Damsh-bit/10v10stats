import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTeamColorClass(teamName: string) {
  const name = teamName.toLowerCase().trim()
  if (name.includes('viejo')) {
    return 'bg-purple-500/15 text-purple-400 border-purple-500/20'
  }
  if (name.includes('papi')) {
    return 'bg-blue-500/15 text-blue-400 border-blue-500/20'
  }
  return 'bg-primary/10 text-primary border-primary/20'
}
