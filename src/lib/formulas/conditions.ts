// TODO: replace with real §9, §10, §11 formulas
import type { Attributes, ConditionInput, ConditionResult, PenetrationInput, PenetrationResult } from '@/types'

export function computeSeverity(input: ConditionInput): ConditionResult {
  void input
  return { severity: 0, band: 'none', description: 'TODO' }
}

export function computePenetration(input: PenetrationInput): PenetrationResult {
  void input
  return { penetration: 0, label: 'TODO' }
}

export function computePoisonResistance(attrs: Attributes): number {
  void attrs; return 0
}

export function computeStaggerResistance(attrs: Attributes): number {
  void attrs; return 0
}

export function computeManaCrashResistance(attrs: Attributes): number {
  void attrs; return 0
}
