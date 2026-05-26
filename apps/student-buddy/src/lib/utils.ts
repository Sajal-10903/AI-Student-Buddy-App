import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getGradeColor(accuracy: number): string {
  if (accuracy >= 90) return "text-success bg-success/10 border-success/20";
  if (accuracy >= 70) return "text-primary bg-primary/10 border-primary/20";
  if (accuracy >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  return "text-destructive bg-destructive/10 border-destructive/20";
}
