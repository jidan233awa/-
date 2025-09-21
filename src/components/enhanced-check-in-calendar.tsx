"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, Check, AlertTriangle } from "lucide-react";
import {
  getServerDate,
  formatServerDate,
  isSameDay,
  isDateBeforeToday,
  calculateDateDifference
} from "@/lib/utils";

interface CheckInData {
  [date: string]: {
    checkedIn: boolean;
    timestamp: number;
    isManual?: boolean; // 标记是否为补卡
  };
}

interface MakeupRecord {
  date: string;
  timestamp: number;
  originalDate: string;
}

interface DayProps {
  date: number;
  isToday: boolean;
  isCheckedIn: boolean;
  isManual?: boolean;
  onCheckIn: (date: number) => void;
  disabled?: boolean;
}

const Day = ({ date, isToday, isCheckedIn, isManual, onCheckIn, disabled }: DayProps) => (
  <button
    onClick={() => !disabled && onCheckIn(date)}
    disabled={disabled}
    className={`
      w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center
      text-xs sm:text-sm font-medium min-w-0
      transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500
      relative
      ${isToday ? 'ring-1 sm:ring-2 ring-blue-500' : ''}
      ${isCheckedIn
        ? isManual
          ? 'bg-orange-500 text-white hover:bg-orange-600'
          : 'bg-green-500 text-white hover:bg-green-600'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : 'cursor-pointer'}
    `}
  >
    {isCheckedIn ? (isManual ? '补' : <Check size={10} className="xs:w-3 xs:h-3 sm:w-4 sm:h-4" />) : date}
  </button>
);

export default function EnhancedCheckInCalendar() {
  const [checkInData, setCheckInData] = useState<CheckInData>({});
  const [makeupRecords, setMakeupRecords] = useState<MakeupRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(getServerDate());
  const [stats, setStats] = useState({ total: 0, thisMonth: 0, streak: 0, makeup: 0 });
  const [showMakeupDialog, setShowMakeupDialog] = useState(false);
  const [pendingMakeupDate, setPendingMakeupDate] = useState<Date | null>(null);

  const serverNow = getServerDate();
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
      const savedCheckIns = localStorage.getItem('enhancedCheckInData');
      const savedMakeups = localStorage.getItem('makeupRecords');

      if (savedCheckIns) {
        const parsed = JSON.parse(savedCheckIns);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // 验证数据格式
          const validatedData: CheckInData = {};
          Object.entries(parsed).forEach(([date, value]) => {
            if (typeof value === 'object' && value !== null &&
                'checkedIn' in value && typeof value.checkedIn === 'boolean' &&
                'timestamp' in value && typeof value.timestamp === 'number' &&
                /^\d{4}-\d{2}-\d{2}$/.test(date)) {
              validatedData[date] = value as CheckInData[string];
            }
          });
          setCheckInData(validatedData);
        }
      }

      if (savedMakeups) {
        const parsed = JSON.parse(savedMakeups);
        if (Array.isArray(parsed)) {
          // 验证补卡记录格式
          const validatedRecords: MakeupRecord[] = parsed.filter(record =>
            record &&
            typeof record.date === 'string' &&
            typeof record.timestamp === 'number' &&
            typeof record.originalDate === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(record.date)
          );
          setMakeupRecords(validatedRecords);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setCheckInData({});
      setMakeupRecords([]);
      localStorage.removeItem('enhancedCheckInData');
      localStorage.removeItem('makeupRecords');
    }
  }, []);

  const calculateStats = useCallback(() => {
    const checkedDates = Object.keys(checkInData).filter(date => checkInData[date].checkedIn);
    const total = checkedDates.length;

    const thisMonthCount = checkedDates.filter(date => {
      const d = new Date(date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    const makeupCount = checkedDates.filter(date => checkInData[date].isManual).length;

    let streak = 0;
    const sortedDates = checkedDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const todayStr = formatServerDate(getServerDate());

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

    setStats({ total, thisMonth: thisMonthCount, streak, makeup: makeupCount });
  }, [checkInData, month, year]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const handleCheckIn = useCallback((day: number) => {
    try {
      // 输入验证
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        console.warn('Invalid day:', day);
        return;
      }

      const targetDate = new Date(year, month, day);

      // 检查日期是否有效
      if (isNaN(targetDate.getTime()) || targetDate.getDate() !== day) {
        console.warn('Invalid date:', year, month, day);
        return;
      }

      const dateStr = formatServerDate(targetDate);
      const now = getServerDate();

      // 检查是否已经打卡
      if (checkInData[dateStr]?.checkedIn) {
        return; // 不允许取消打卡
      }

      // 如果是今天，直接打卡
      if (isSameDay(targetDate, now)) {
        const newCheckInData = {
          ...checkInData,
          [dateStr]: {
            checkedIn: true,
            timestamp: now.getTime(),
            isManual: false
          }
        };

        setCheckInData(newCheckInData);
        try {
          localStorage.setItem('enhancedCheckInData', JSON.stringify(newCheckInData));
        } catch (storageError) {
          console.error('Failed to save check-in data:', storageError);
          // 回滚状态
          setCheckInData(checkInData);
        }
        return;
      }

      // 如果是过去的日期，需要补卡确认
      if (isDateBeforeToday(targetDate)) {
        setPendingMakeupDate(targetDate);
        setShowMakeupDialog(true);
        return;
      }

      // 禁止未来日期打卡
    } catch (error) {
      console.error('Failed to handle check-in:', error);
    }
  }, [year, month, checkInData]);

  const confirmMakeup = useCallback(() => {
    if (!pendingMakeupDate) return;

    try {
      const dateStr = formatServerDate(pendingMakeupDate);
      const now = getServerDate();

      // 再次检查是否已经打卡
      if (checkInData[dateStr]?.checkedIn) {
        setShowMakeupDialog(false);
        setPendingMakeupDate(null);
        return;
      }

      const newCheckInData = {
        ...checkInData,
        [dateStr]: {
          checkedIn: true,
          timestamp: now.getTime(),
          isManual: true
        }
      };

      const newMakeupRecord: MakeupRecord = {
        date: dateStr,
        timestamp: now.getTime(),
        originalDate: formatServerDate(now)
      };

      const newMakeupRecords = [...makeupRecords, newMakeupRecord];

      // 原子性更新
      try {
        localStorage.setItem('enhancedCheckInData', JSON.stringify(newCheckInData));
        localStorage.setItem('makeupRecords', JSON.stringify(newMakeupRecords));

        setCheckInData(newCheckInData);
        setMakeupRecords(newMakeupRecords);

        setShowMakeupDialog(false);
        setPendingMakeupDate(null);
      } catch (storageError) {
        console.error('Failed to save makeup data:', storageError);
        // 不更新状态，保持原有数据
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('Failed to confirm makeup:', error);
      alert('操作失败，请重试');
    }
  }, [pendingMakeupDate, checkInData, makeupRecords]);

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

  const isToday = useCallback((day: number) => {
    return isSameDay(new Date(year, month, day), serverNow);
  }, [year, month, serverNow]);

  const isFutureDate = useCallback((day: number) => {
    const date = new Date(year, month, day);
    return date > serverNow;
  }, [year, month, serverNow]);

  const renderCalendarDays = useCallback(() => {
    const days = [];

    for (let i = 0; i < startDate; i++) {
      days.push(<div key={`empty-${i}`} className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatServerDate(new Date(year, month, day));
      const checkInInfo = checkInData[dateStr];
      const isCheckedIn = checkInInfo?.checkedIn || false;
      const isManual = checkInInfo?.isManual || false;
      const disabled = isFutureDate(day);

      days.push(
        <Day
          key={day}
          date={day}
          isToday={isToday(day)}
          isCheckedIn={isCheckedIn}
          isManual={isManual}
          onCheckIn={handleCheckIn}
          disabled={disabled}
        />
      );
    }

    return days;
  }, [startDate, daysInMonth, year, month, checkInData, handleCheckIn, isFutureDate, isToday]);

  const todayStr = formatServerDate(serverNow);
  const todayChecked = checkInData[todayStr]?.checkedIn || false;

  return (
    <>
      <div className="max-w-md mx-auto p-4 space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <CalendarDays className="w-5 h-5" />
              打卡日历
            </CardTitle>
            <p className="text-sm text-gray-500">服务器时间: {formatServerDate(serverNow)}</p>
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

            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center">
              {weekDays.map(day => (
                <div key={day} className="w-7 h-6 xs:w-8 xs:h-7 sm:w-9 sm:h-8 md:w-10 md:h-8 flex items-center justify-center text-xs sm:text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              {renderCalendarDays()}
            </div>

            <div className="grid grid-cols-4 gap-4 text-center mt-6">
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
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600">{stats.makeup}</div>
                <div className="text-xs text-gray-500">补卡</div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>正常打卡</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>补卡</span>
                </div>
              </div>
            </div>

            {!todayChecked && isSameDay(new Date(year, month, serverNow.getDate()), serverNow) && (
              <Button
                onClick={() => handleCheckIn(serverNow.getDate())}
                className="w-full"
              >
                今日打卡
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showMakeupDialog} onOpenChange={setShowMakeupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              补卡确认
            </AlertDialogTitle>
            <AlertDialogDescription>
              您正在为 <strong>{pendingMakeupDate ? formatServerDate(pendingMakeupDate) : ''}</strong> 进行补卡。
              <br />
              补卡记录将被标记并保存到统计页面。
              <br />
              <br />
              <span className="text-sm text-gray-500">
                补卡时间: {formatServerDate(getServerDate())}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowMakeupDialog(false);
              setPendingMakeupDate(null);
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmMakeup}>
              确认补卡
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}