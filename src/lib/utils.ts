import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function round(value: number, decimals = 2): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toPercent(value: number, decimals = 0): string {
  return `${round(value * 100, decimals)}%`;
}

export function fmtResource(value: number): string {
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
}

export function fmtCoeff(coeff: number): string {
  return coeff === 1 ? '' : `${coeff}×`;
}

export function severityColor(severity: number): string {
  if (severity < 0) return 'text-zinc-500';
  if (severity < 1) return 'text-yellow-400';
  if (severity < 2) return 'text-orange-400';
  if (severity < 3) return 'text-red-500';
  return 'text-red-700';
}
