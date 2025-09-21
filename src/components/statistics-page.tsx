"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { BarChart3, Calendar, Clock, TrendingUp, ArrowLeft, AlertTriangle, Upload, Download } from "lucide-react";
import { formatServerDate, getServerDate, encryptData, decryptData } from "@/lib/utils";

interface CheckInData {
  [date: string]: {
    checkedIn: boolean;
    timestamp: number;
    isManual?: boolean;
  };
}

interface MakeupRecord {
  date: string;
  timestamp: number;
  originalDate: string;
}

interface StatisticsPageProps {
  onBack: () => void;
}

export default function StatisticsPage({ onBack }: StatisticsPageProps) {
  const [checkInData, setCheckInData] = useState<CheckInData>({});
  const [makeupRecords, setMakeupRecords] = useState<MakeupRecord[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<Record<string, {
    total: number;
    normal: number;
    makeup: number;
  }>>({});
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
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
          const validatedRecords: MakeupRecord[] = parsed.filter((record: unknown): record is MakeupRecord =>
            record !== null &&
            typeof record === 'object' &&
            'date' in record &&
            'timestamp' in record &&
            'originalDate' in record &&
            typeof record.date === 'string' &&
            typeof record.timestamp === 'number' &&
            typeof record.originalDate === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(record.date)
          );
          setMakeupRecords(validatedRecords);
        }
      }
    } catch (error) {
      console.error('Failed to load statistics data:', error);
      setCheckInData({});
      setMakeupRecords([]);
    }
  };

  const calculateMonthlyStats = useCallback(() => {
    const stats: Record<string, { total: number; normal: number; makeup: number }> = {};

    try {
      Object.keys(checkInData).forEach(dateStr => {
        const checkInInfo = checkInData[dateStr];
        if (!checkInInfo?.checkedIn) return;

        const date = new Date(dateStr);

        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          console.warn('Invalid date in checkInData:', dateStr);
          return;
        }

        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!stats[monthKey]) {
          stats[monthKey] = { total: 0, normal: 0, makeup: 0 };
        }

        stats[monthKey].total++;
        if (checkInInfo.isManual) {
          stats[monthKey].makeup++;
        } else {
          stats[monthKey].normal++;
        }
      });
    } catch (error) {
      console.error('Failed to calculate monthly stats:', error);
    }

    setMonthlyStats(stats);
  }, [checkInData]);

  useEffect(() => {
    calculateMonthlyStats();
  }, [calculateMonthlyStats]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getOverallStats = () => {
    const checkedDates = Object.keys(checkInData).filter(date => checkInData[date].checkedIn);
    const totalDays = checkedDates.length;
    const normalDays = checkedDates.filter(date => !checkInData[date].isManual).length;
    const makeupDays = checkedDates.filter(date => checkInData[date].isManual).length;

    // 计算连续打卡
    let maxStreak = 0;
    let currentStreak = 0;
    const sortedDates = checkedDates.sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffTime = currDate.getTime() - prevDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (diffDays === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    return { totalDays, normalDays, makeupDays, maxStreak };
  };

  const clearAllData = () => {
    try {
      localStorage.removeItem('enhancedCheckInData');
      localStorage.removeItem('makeupRecords');
      setCheckInData({});
      setMakeupRecords([]);
      setMonthlyStats({});
      setShowClearDialog(false);
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('清除数据失败，请重试');
    }
  };

  const exportEncryptedData = () => {
    try {
      const data = {
        checkInData,
        makeupRecords,
        exportTime: formatServerDate(getServerDate()),
        version: '1.0'
      };

      const jsonString = JSON.stringify(data, null, 2);
      const encryptedData = encryptData(jsonString);

      const blob = new Blob([encryptedData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checkin-data-${formatServerDate(getServerDate())}.crw`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('导出失败，请重试');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const encryptedContent = e.target?.result as string;
        const decryptedData = decryptData(encryptedContent);
        const parsedData = JSON.parse(decryptedData);

        // 验证数据格式
        if (!parsedData.checkInData || typeof parsedData.checkInData !== 'object' ||
            !Array.isArray(parsedData.makeupRecords)) {
          throw new Error('数据格式不正确');
        }

        // 验证导入的数据格式
        const validatedImportData: CheckInData = {};
        Object.entries(parsedData.checkInData).forEach(([date, value]) => {
          if (typeof value === 'object' && value !== null &&
              'checkedIn' in value && typeof value.checkedIn === 'boolean' &&
              'timestamp' in value && typeof value.timestamp === 'number' &&
              /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            validatedImportData[date] = value as CheckInData[string];
          }
        });

        const validatedImportRecords: MakeupRecord[] = parsedData.makeupRecords.filter((record: unknown): record is MakeupRecord =>
          record !== null &&
          typeof record === 'object' &&
          'date' in record &&
          'timestamp' in record &&
          'originalDate' in record &&
          typeof record.date === 'string' &&
          typeof record.timestamp === 'number' &&
          typeof record.originalDate === 'string'
        );

        // 合并数据（保留现有数据，添加新数据）
        const mergedCheckInData = { ...checkInData, ...validatedImportData };
        const mergedMakeupRecords = [...makeupRecords, ...validatedImportRecords];

        setCheckInData(mergedCheckInData);
        setMakeupRecords(mergedMakeupRecords);

        localStorage.setItem('enhancedCheckInData', JSON.stringify(mergedCheckInData));
        localStorage.setItem('makeupRecords', JSON.stringify(mergedMakeupRecords));

        alert(`导入成功！\n导入时间：${parsedData.exportTime || '未知'}`);
      } catch (error) {
        console.error('Import failed:', error);
        alert('导入失败：' + (error instanceof Error ? error.message : '文件格式错误'));
      } finally {
        setImporting(false);
        // 清除文件选择
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const overallStats = getOverallStats();
  const sortedMonths = Object.keys(monthlyStats).sort().reverse();
  const sortedMakeupRecords = [...makeupRecords].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">打卡统计</h1>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{overallStats.totalDays}</div>
            <div className="text-sm text-gray-500">总打卡天数</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{overallStats.normalDays}</div>
            <div className="text-sm text-gray-500">正常打卡</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{overallStats.makeupDays}</div>
            <div className="text-sm text-gray-500">补卡次数</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{overallStats.maxStreak}</div>
            <div className="text-sm text-gray-500">最长连续</div>
          </CardContent>
        </Card>
      </div>

      {/* 月度统计 */}
      <Card>
        <CardHeader>
          <CardTitle>月度统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedMonths.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无数据</p>
            ) : (
              sortedMonths.map(month => {
                const stats = monthlyStats[month];
                const [year, monthNum] = month.split('-');
                const monthName = `${year}年${monthNum}月`;

                return (
                  <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium">{monthName}</div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">总计:</span>
                        <span className="font-semibold text-blue-600">{stats.total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">正常:</span>
                        <span className="font-semibold text-green-600">{stats.normal}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">补卡:</span>
                        <span className="font-semibold text-orange-600">{stats.makeup}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 补卡记录 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            补卡记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedMakeupRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无补卡记录</p>
            ) : (
              sortedMakeupRecords.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <div className="font-medium text-orange-800">
                      补卡日期: {record.date}
                    </div>
                    <div className="text-sm text-orange-600">
                      操作时间: {formatTimestamp(record.timestamp)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      延迟天数: {Math.floor((record.timestamp - new Date(record.date).getTime()) / (1000 * 60 * 60 * 24))} 天
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={exportEncryptedData}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              导出数据
            </Button>

            <div className="relative">
              <input
                type="file"
                accept=".crw"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={importing}
              />
              <Button
                variant="outline"
                disabled={importing}
                className="w-full flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {importing ? '导入中...' : '导入数据'}
              </Button>
            </div>

            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              清除数据
            </Button>
          </div>
          <div className="text-sm text-gray-500 mt-3 space-y-1">
            <p>• 导出格式为 .crw 文件</p>
            <p>• 导入时会自动合并现有数据，不会覆盖</p>
            <p>• 数据保存在浏览器本地，建议定期备份</p>
          </div>
        </CardContent>
      </Card>

      {/* 清除数据确认弹窗 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              危险操作确认
            </AlertDialogTitle>
            <AlertDialogDescription>
              您即将清除所有打卡数据！此操作将永久删除所有记录且无法撤销。
            </AlertDialogDescription>
            <div className="space-y-3 mt-4">
              <div className="text-sm text-gray-600 space-y-1">
                <div>• 所有打卡记录将被永久删除</div>
                <div>• 所有补卡记录将被永久删除</div>
                <div>• 所有统计数据将被重置</div>
                <div className="text-red-600 font-medium">⚠️ 此操作无法撤销</div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  💡 建议在清除前先点击&ldquo;导出数据&rdquo;进行备份
                </div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAllData}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              确认清除所有数据
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}