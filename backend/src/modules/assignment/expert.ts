import { AssignmentPriority } from './types.js';

// ── Expert availability states ────────────────────────────────────────────────

export type ExpertState = 'available' | 'busy' | 'offline';

// ── Skill / domain representation ─────────────────────────────────────────────

export interface ExpertSkill {
  domain: string;           // e.g. 'pesticide', 'irrigation', 'crop-disease'
  proficiency: number;      // 1–5 scale, used for skill-based matching
}

export interface ExpertAvailability {
  dayOfWeek: number;        // 0 = Sunday, 6 = Saturday
  startHour: number;        // 0–23
  endHour: number;          // 0–23
}

// ── Expert record ─────────────────────────────────────────────────────────────

export interface IExpert {
  _id?: string;
  userId: string;           // links to User collection
  name: string;
  email: string;
  skills: ExpertSkill[];
  state: ExpertState;
  availability: ExpertAvailability[];
  maxAssignments: number;   // global cap across all priorities
  slaMinutes: number;       // target response time in minutes
  isActive: boolean;        // soft-disable flag
  createdAt: Date;
  updatedAt: Date;
}

// ── Performance record (used for skill-based matching) ────────────────────────

export interface IExpertPerformance {
  _id?: string;
  expertId: string;
  domain: string;
  totalReviews: number;
  avgReviewTimeMinutes: number;
  accuracyScore: number;    // 0–1, from QA/golden-dataset checks
  lastReviewedAt?: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isExpertAvailable(expert: IExpert): boolean {
  return expert.state === 'available' && expert.isActive;
}

export function getExpertUtilization(
  activeAssignments: number,
  maxAssignments: number,
): number {
  if (maxAssignments === 0) return 0;
  return Math.round((activeAssignments / maxAssignments) * 100);
}