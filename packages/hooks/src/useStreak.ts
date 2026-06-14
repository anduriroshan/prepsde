import { useState } from "react";

export function useStreak(initialStreak = 0) {
  const [streak, setStreak] = useState(initialStreak);
  return { streak, setStreak };
}
