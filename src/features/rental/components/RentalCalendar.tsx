"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  isBefore,
  addMonths,
  subMonths,
  addDays,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  differenceInCalendarDays,
} from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/shared/utils/cn";

interface RentalCalendarProps {
  productId: string;
  minDays: number;
  maxDays: number;
  onDateSelect: (start: Date | null, end: Date | null) => void;
}

/**
 * Kiralama Takvim Bileşeni
 * Louez ve Sharetribe rezervasyon takvimi modelinden esinlenmiştir.
 * - Bloklanmış tarihleri API'den çeker ve görsel olarak kilitler
 * - Hem interaktif takvimden tıklayarak hem de tarih seçici alanlardan esnek gün aralığı seçimi sağlar
 * - Hızlı süre butonları (1 gün, 3 gün, 1 hafta, 2 hafta) sunar
 */
export function RentalCalendar({
  productId,
  minDays = 1,
  maxDays = 30,
  onDateSelect,
}: RentalCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [blockedRanges, setBlockedRanges] = useState<
    Array<{ startDate: string; endDate: string }>
  >([]);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Bloklanmış tarihleri API'den çek
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    fetch(`/api/rentals/availability?productId=${productId}&year=${year}&month=${month}`)
      .then((res) => res.json())
      .then((data) => setBlockedRanges(data.blocks ?? []))
      .catch(() => setBlockedRanges([]));
  }, [productId, currentMonth]);

  const isDateBlocked = useCallback(
    (date: Date) => {
      return blockedRanges.some((range) => {
        const start = new Date(range.startDate);
        const end = new Date(range.endDate);
        return isWithinInterval(date, { start, end });
      });
    },
    [blockedRanges]
  );

  const applyDates = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    onDateSelect(start, end);
  };

  const handleDayClick = (day: Date) => {
    if (isDateBlocked(day) || isBefore(day, new Date())) return;

    if (!startDate || (startDate && endDate)) {
      // Yeni başlangıç seç
      applyDates(day, null);
    } else {
      // Bitiş tarihini seç
      if (isBefore(day, startDate)) {
        applyDates(day, null);
        return;
      }

      // Aynı gün seçildiyse 1 günlük kiralama (ertesi güne kadar)
      const targetEnd = isSameDay(day, startDate) ? addDays(startDate, 1) : day;
      const days = Math.max(1, differenceInCalendarDays(targetEnd, startDate));

      if (days < minDays) {
        alert(`Minimum kiralama süresi ${minDays} gündür`);
        return;
      }
      if (days > maxDays) {
        alert(`Maksimum kiralama süresi ${maxDays} gündür`);
        return;
      }

      // Aralıkta bloklu gün var mı kontrol et
      const range = eachDayOfInterval({ start: startDate, end: targetEnd });
      const hasBlocked = range.some((d) => isDateBlocked(d));
      if (hasBlocked) {
        alert("Seçilen tarih aralığında müsait olmayan günler var");
        return;
      }

      applyDates(startDate, targetEnd);
    }
  };

  // Hızlı Süre Seçimi (Preset)
  const handleQuickSelect = (daysCount: number) => {
    const start = startDate || new Date();
    const end = addDays(start, daysCount);
    applyDates(start, end);
  };

  // Manuel input değişimi
  const handleStartDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      applyDates(null, null);
      return;
    }
    const newStart = new Date(e.target.value);
    const newEnd = endDate && isAfter(endDate, newStart) ? endDate : addDays(newStart, Math.max(1, minDays));
    applyDates(newStart, newEnd);
  };

  const handleEndDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      applyDates(startDate, null);
      return;
    }
    const newEnd = new Date(e.target.value);
    if (startDate && isBefore(newEnd, startDate)) {
      alert("Bitiş tarihi başlangıç tarihinden önce olamaz");
      return;
    }
    applyDates(startDate || new Date(), newEnd);
  };

  // Takvim günlerini hesapla
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: tr });
  const calendarEnd = endOfWeek(monthEnd, { locale: tr });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  const toInputDate = (d: Date | null) => (d ? format(d, "yyyy-MM-dd") : "");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* 1. Manuel Tarih Seçim Alanları */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700">
          Kiralama Tarih Aralığı
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="mb-1 block text-xs text-gray-500">Başlangıç Günü</span>
            <input
              type="date"
              min={format(new Date(), "yyyy-MM-dd")}
              value={toInputDate(startDate)}
              onChange={handleStartDateInput}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 transition-colors focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs text-gray-500">Bitiş Günü</span>
            <input
              type="date"
              min={startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")}
              value={toInputDate(endDate)}
              onChange={handleEndDateInput}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 transition-colors focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Hızlı Seçim Butonları */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500">Hızlı Seç:</span>
          {[
            { label: "1 Gün", days: 1 },
            { label: "3 Gün", days: 3 },
            { label: "1 Hafta", days: 7 },
            { label: "2 Hafta", days: 14 },
          ].map((preset) => (
            <button
              key={preset.days}
              type="button"
              onClick={() => handleQuickSelect(preset.days)}
              className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 active:bg-purple-200"
            >
              {preset.label}
            </button>
          ))}
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => applyDates(null, null)}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* 2. İnteraktif Takvim Görünümü */}
      <div className="border-t border-gray-100 pt-3">
        {/* Ay Navigasyonu */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            ←
          </button>
          <h3 className="text-sm font-semibold capitalize text-gray-900">
            {format(currentMonth, "MMMM yyyy", { locale: tr })}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            →
          </button>
        </div>

        {/* Haftanın Günleri */}
        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-1 text-center text-xs font-semibold text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Günler */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isBlocked = isDateBlocked(day);
            const isPast = isBefore(day, new Date()) && !isSameDay(day, new Date());
            const isStart = startDate && isSameDay(day, startDate);
            const isEnd = endDate && isSameDay(day, endDate);
            const isInRange =
              startDate &&
              endDate &&
              isAfter(day, startDate) &&
              isBefore(day, endDate);
            const isHoverRange =
              startDate &&
              !endDate &&
              hoveredDate &&
              isAfter(day, startDate) &&
              (isBefore(day, hoveredDate) || isSameDay(day, hoveredDate));

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                disabled={!isCurrentMonth || isPast || isBlocked}
                className={cn(
                  "relative h-9 w-full rounded-lg text-xs font-medium transition-colors",
                  {
                    "text-gray-300": !isCurrentMonth,
                    "cursor-not-allowed bg-red-50 text-red-300 line-through":
                      isBlocked && isCurrentMonth,
                    "cursor-not-allowed text-gray-300": isPast && isCurrentMonth,
                    "bg-purple-600 font-bold text-white shadow-sm": isStart || isEnd,
                    "bg-purple-100 text-purple-800 font-semibold": isInRange,
                    "bg-purple-50 text-purple-600": isHoverRange,
                    "hover:bg-gray-100 text-gray-700":
                      isCurrentMonth && !isPast && !isBlocked && !isStart && !isEnd,
                  }
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>

        {/* Seçim Bilgisi */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-600" /> Seçili
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-100 ring-1 ring-red-300" /> Müsait Değil
          </span>
          <span className="ml-auto text-[11px] text-gray-400">
            Min: {minDays} gün / Maks: {maxDays} gün
          </span>
        </div>
      </div>
    </div>
  );
}
