"use client";

import { useState, useCallback } from "react";
import type { AvailabilityCheckResult } from "../types";

interface UseRentalCalendarReturn {
  startDate: Date | null;
  endDate: Date | null;
  isChecking: boolean;
  isAvailable: boolean | null;
  setDates: (start: Date | null, end: Date | null) => void;
  checkAvailability: (productId: string) => Promise<AvailabilityCheckResult | null>;
  reset: () => void;
}

/**
 * Kiralama takvimi için custom hook
 */
export function useRentalCalendar(): UseRentalCalendarReturn {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const setDates = useCallback((start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    setIsAvailable(null); // Reset availability when dates change
  }, []);

  const checkAvailability = useCallback(
    async (productId: string): Promise<AvailabilityCheckResult | null> => {
      if (!startDate || !endDate) return null;

      setIsChecking(true);
      try {
        const res = await fetch("/api/rentals/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }),
        });

        const result: AvailabilityCheckResult = await res.json();
        setIsAvailable(result.available);
        return result;
      } catch {
        setIsAvailable(null);
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [startDate, endDate]
  );

  const reset = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setIsAvailable(null);
  }, []);

  return {
    startDate,
    endDate,
    isChecking,
    isAvailable,
    setDates,
    checkAvailability,
    reset,
  };
}
