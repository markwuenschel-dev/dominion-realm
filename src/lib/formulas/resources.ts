// TODO: replace with real §1, §2, §6 formulas
import type { Attributes, ResourceMaxima, CurrentResources, ResourceRatios } from '@/types'

export function computeResourceMaxima(attrs: Attributes, soulLevelMod = 1.0): ResourceMaxima {
  void attrs; void soulLevelMod
  return { HP: 0, Mana: 0, Stamina: 0, Reserve: 0 }
}

export function computeAllRatios(current: CurrentResources, maxima: ResourceMaxima): ResourceRatios {
  const safe = (c: number, m: number) => (m > 0 ? c / m : 0)
  return {
    HP:      safe(current.HP,      maxima.HP),
    Mana:    safe(current.Mana,    maxima.Mana),
    Stamina: safe(current.Stamina, maxima.Stamina),
    Reserve: safe(current.Reserve, maxima.Reserve),
  }
}
