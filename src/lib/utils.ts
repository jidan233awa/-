import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export function sanitizeLocalStorageData(data: unknown): Record<string, boolean> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const sanitized: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(data)) {
    if (validateDate(key) && typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function formatDateSafely(date: Date): string {
  try {
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function calculateDateDifference(date1: Date, date2: Date): number {
  try {
    return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function getServerDate(): Date {
  return new Date();
}

export function formatServerDate(date: Date): string {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return formatServerDate(new Date());
  }
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return formatServerDate(date1) === formatServerDate(date2);
}

export function isDateBeforeToday(date: Date): boolean {
  const today = getServerDate();
  const targetDate = formatServerDate(date);
  const todayStr = formatServerDate(today);
  return targetDate < todayStr;
}

// 简单的加密/解密函数（基于Base64和简单变换）
const ENCRYPTION_KEY = 'CheckInCalendar2025';

export function encryptData(data: string): string {
  try {
    // 先进行JSON字符串的简单变换
    const transformed = data.split('').map((char, index) => {
      const keyChar = ENCRYPTION_KEY[index % ENCRYPTION_KEY.length];
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
    }).join('');

    // 再进行Base64编码
    return btoa(transformed);
  } catch {
    throw new Error('数据加密失败');
  }
}

export function decryptData(encryptedData: string): string {
  try {
    // 先进行Base64解码
    const decoded = atob(encryptedData);

    // 再进行逆变换
    const original = decoded.split('').map((char, index) => {
      const keyChar = ENCRYPTION_KEY[index % ENCRYPTION_KEY.length];
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
    }).join('');

    return original;
  } catch {
    throw new Error('数据解密失败，请检查文件是否正确');
  }
}
