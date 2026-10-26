import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS sınıflarını birleştirmek için yardımcı fonksiyon.
 * clsx ile koşullu sınıfları, twMerge ile çakışan sınıfları çözer.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
