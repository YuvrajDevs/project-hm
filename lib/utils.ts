import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateId(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
export function getCheckInDateId(date: Date = new Date()): string {
    const resetHour = 6;
    const currentHour = date.getHours();
    
    // Copy date and adjust back by 1 day if before 6 AM
    const adjustedDate = new Date(date.getTime());
    if (currentHour < resetHour) {
        adjustedDate.setDate(adjustedDate.getDate() - 1);
    }
    
    return formatDateId(adjustedDate);
}
