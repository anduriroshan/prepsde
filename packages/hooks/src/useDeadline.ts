import { useState, useEffect } from "react";

export function useDeadline(targetDate: string) {
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    setDaysLeft(Math.max(0, diff));
  }, [targetDate]);

  return { daysLeft };
}
