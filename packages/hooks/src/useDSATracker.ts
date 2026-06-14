import { useState } from "react";

export type Difficulty = "easy" | "medium" | "hard";
export type Pattern =
  | "arrays" | "two-pointers" | "sliding-window" | "stack"
  | "binary-search" | "linked-list" | "trees" | "graphs"
  | "heap" | "dp" | "backtracking" | "tries" | "greedy"
  | "intervals" | "bit-manipulation";

export interface Problem {
  id: string;
  name: string;
  difficulty: Difficulty;
  pattern: Pattern;
  solvedIndependently: "yes" | "no" | "partially";
  notes?: string;
  url?: string;
  nextReviewDate: string;
  reviewCount: number;
  mastered: boolean;
}

export function useDSATracker(initial: Problem[] = []) {
  const [problems, setProblems] = useState<Problem[]>(initial);

  function addProblem(p: Omit<Problem, "id" | "nextReviewDate" | "reviewCount" | "mastered">) {
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + 3);
    setProblems((prev) => [
      ...prev,
      {
        ...p,
        id: Date.now().toString(),
        nextReviewDate: reviewDate.toISOString().split("T")[0],
        reviewCount: 0,
        mastered: false,
      },
    ]);
  }

  function markReviewed(id: string, struggled: boolean) {
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const intervals = [3, 7, 15];
        const nextInterval = struggled ? 3 : (intervals[p.reviewCount] ?? 30);
        const next = new Date();
        next.setDate(next.getDate() + nextInterval);
        return {
          ...p,
          reviewCount: struggled ? 0 : p.reviewCount + 1,
          nextReviewDate: next.toISOString().split("T")[0],
          mastered: !struggled && p.reviewCount >= 2,
        };
      })
    );
  }

  const dueToday = problems.filter(
    (p) => !p.mastered && p.nextReviewDate <= new Date().toISOString().split("T")[0]
  );

  return { problems, addProblem, markReviewed, dueToday };
}
