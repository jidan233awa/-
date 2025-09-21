"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import EnhancedCheckInCalendar from "@/components/enhanced-check-in-calendar";
import StatisticsPage from "@/components/statistics-page";

export default function Home() {
  const [currentView, setCurrentView] = useState<'calendar' | 'statistics'>('calendar');

  if (currentView === 'statistics') {
    return <StatisticsPage onBack={() => setCurrentView('calendar')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <div className="relative max-w-md mx-auto mb-4">
            <h1 className="text-4xl font-bold text-slate-900">
              每日打卡
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView('statistics')}
              className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              统计
            </Button>
          </div>
          <p className="text-lg text-slate-600">
            养成良好习惯，记录每日成长
          </p>
          <p className="text-sm text-slate-500 mt-2">
            每日仅可打卡一次
          </p>
        </div>

        <EnhancedCheckInCalendar />
      </div>
    </div>
  );
}
