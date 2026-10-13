import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatDateId, getCheckInDateId, addDays, eventFallsOn, countStreak } from "./dates";

export function formatRelativeTime(date: string | Date | number): string {
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "just now";
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatFullDateTime(date: string | Date | number): string {
    const d = new Date(date);
    return d.toLocaleString(undefined, { 
        month: "short", 
        day: "numeric", 
        year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
        hour: "numeric", 
        minute: "2-digit",
        hour12: true 
    });
}
