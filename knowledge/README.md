# PrepSDE Knowledge Base

Welcome to the knowledge repository of **PrepSDE**. This directory contains the background context, study plan, and technical architecture of the PrepSDE companion application designed to help Anduri Roshan prepare for SDE2 interviews at companies like Amazon, Google, and top-tier AI firms.

## Documents

*   [6-Month Preparation Plan](preparation_plan.md): The detailed 24-week curriculum covering DSA, Classical System Design, Low-Level Design (LLD), AI/ML System Design, MLOps, and Behavioral preparation.
*   [Technical Architecture](architecture.md): The implementation details of the PrepSDE Progressive Web App (PWA), including state management, spaced repetition scheduling, EmailJS notifications, and the Gemini AI coach agent client.

---

## What is PrepSDE?

PrepSDE is a self-hosted, lightweight, premium Progressive Web Application designed to solve the two biggest pain points of engineering interview preparation: **consistency** and **structured application of concepts**.

### Why it was built
1.  **Consistency Deficit**: Preparing for DSA after years of focus on production development is mentally taxing, leading to losing focus and breaking study habits. PrepSDE embeds habit loops like streak tracking and end-of-day reflections.
2.  **Lack of System Design Practice**: SDE2 interviews demand advanced-level design (especially AI Agentic architectures, LLMOps, and multi-tenancy). PrepSDE includes a weekly, structured system design plan.
3.  **Self-Correction with AI**: If a user logs lazy or low-value reflections (e.g., "fine", "dsa"), an embedded Gemini AI Coach evaluates the reflection, calls them out, and teaches them a micro-concept to keep them learning even on low-effort days.

---

## Key Features

1.  **Automated 24-Week Task Board**: Displays daily checklists automatically based on the user's progress through the 6-month plan.
2.  **DSA Tracker with Spaced Repetition (3-7-15 Rule)**: Solved problems are scheduled for review on Day 3, Day 7, and Day 15 to combat the "forgetting curve."
3.  **Active Reflection Journal**: Prompts users at the end of the day to rate their productivity, summarize accomplishments, and document struggles.
4.  **AI Coach (Gemini)**: Integrates directly with Gemini API to provide feedback on reflections, identify lack of focus, and provide micro-lessons.
5.  **Daily Email Reminders**: Integrates with EmailJS to send today's task checklist directly to the user's mailbox.
6.  **Progress Heatmap & Analytics**: Displays NeetCode 150 completion progress and a GitHub-style activity calendar.
7.  **100% Client-Side / Mobile-Ready**: Installs as a PWA, operates offline, and runs entirely in the browser using `localStorage` to ensure full data privacy.
