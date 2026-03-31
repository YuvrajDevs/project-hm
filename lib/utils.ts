import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRecent(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = Math.abs(now.getTime() - date.getTime());
    const hours = diffInMs / (1000 * 60 * 60);
    return hours <= 24;
  } catch (e) {
    return false;
  }
}
