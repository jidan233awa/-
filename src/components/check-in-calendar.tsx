"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Check } from "lucide-react";
import { sanitizeLocalStorageData, formatDateSafely, calculateDateDifference } from "@/lib/utils";

interface CheckInData {
  [date: string]: boolean;
}

interface DayProps {
  date: number;
  isToday: boolean;
  isCheckedIn: boolean;
  onCheckIn: (date: number) => void;
  disabled?: boolean;
}

const Day = ({ date, isToday, isCheckedIn, onCheckIn, disabled }: DayProps) => (
  <button
    onClick={() => !disabled && onCheckIn(date)}
    disabled={disabled}
    className={`
      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
      transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500
      ${isToday ? 'ring-2 ring-blue-500' : ''}
      ${isCheckedIn
        ? 'bg-green-500 text-white hover:bg-green-600'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'cursor-pointer'}
    `}
  >
    {isCheckedIn ? <Check size={16} /> : date}
  </button>
);

export default function CheckInCalendar() {
  const [checkInData, setCheckInData] = useState<CheckInData>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, streak: 0 });

  const today = useMemo(() => new Date(), []);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = firstDay.getDay();

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('checkInData');
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeLocalStorageData(parsed);
        setCheckInData(sanitized);
      }
    } catch (error) {
      console.error('Failed to load check-in data:', error);
      setCheckInData({});
      localStorage.removeItem('checkInData');
    }
  }, []);

  const calculateStats = useCallback(() => {
    const dates = Object.keys(checkInData).filter(date => checkInData[date]);
    const total = dates.length;

    const thisMonthCount = dates.filter(date => {
      const d = new Date(date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    let streak = 0;
    const sortedDates = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const todayStr = formatDateSafely(today);

    if (sortedDates.includes(todayStr)) {
      streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const current = new Date(sortedDates[i]);
        const previous = new Date(sortedDates[i-1]);
        const diffDays = calculateDateDifference(previous, current);

        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }

    setStats({ total, thisMonth: thisMonthCount, streak });
  }, [checkInData, month, year, today]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);


  const handleCheckIn = (day: number) => {
    try {
      if (day < 1 || day > 31) return;

      const date = new Date(year, month, day);
      const dateStr = formatDateSafely(date);

      if (date > today || !dateStr) return;

      const newCheckInData = {
        ...checkInData,
        [dateStr]: !checkInData[dateStr]
      };

      setCheckInData(newCheckInData);
      localStorage.setItem('checkInData', JSON.stringify(newCheckInData));
    } catch (error) {
      console.error('Failed to handle check-in:', error);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (day: number) => {
    return year === today.getFullYear() &&
           month === today.getMonth() &&
           day === today.getDate();
  };

  const isFutureDate = (day: number) => {
    const date = new Date(year, month, day);
    return date > today;
  };

  const renderCalendarDays = () => {
    const days = [];

    for (let i = 0; i < startDate; i++) {
      days.push(<div key={`empty-${i}`} className="w-10 h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateSafely(new Date(year, month, day));
      const isCheckedIn = checkInData[dateStr] || false;
      const disabled = isFutureDate(day);

      days.push(
        <Day
          key={day}
          date={day}
          isToday={isToday(day)}
          isCheckedIn={isCheckedIn}
          onCheckIn={handleCheckIn}
          disabled={disabled}
        />
      );
    }

    return days;
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CalendarDays className="w-5 h-5" />
            打卡日历
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              ‹
            </Button>
            <h2 className="text-lg font-semibold">
              {year}年 {monthNames[month]}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              ›
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map(day => (
              <div key={day} className="w-10 h-8 flex items-center justify-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            {renderCalendarDays()}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center mt-6">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-500">总打卡</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{stats.thisMonth}</div>
              <div className="text-xs text-gray-500">本月</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">{stats.streak}</div>
              <div className="text-xs text-gray-500">连续</div>
            </div>
          </div>

          {!checkInData[formatDateSafely(today)] && (
            <Button
              onClick={() => handleCheckIn(today.getDate())}
              className="w-full"
              disabled={month !== today.getMonth() || year !== today.getFullYear()}
            >
              今日打卡
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}