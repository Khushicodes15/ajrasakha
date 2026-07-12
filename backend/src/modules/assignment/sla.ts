import { AssignmentPriority } from './types.js';

// ── SLA tier configuration ────────────────────────────────────────────────────

export interface SlaTier {
  priority: AssignmentPriority;
  targetMinutes: number;    // SLA breach threshold
  warningMinutes: number;   // escalation warning threshold
  escalateTo?: string;      // coordinator/admin userId to escalate to
}

// ── SLA breach record ─────────────────────────────────────────────────────────

export interface ISlaBreach {
  _id?: string;
  assignmentId: string;
  questionId: string;
  expertId: string;
  priority: AssignmentPriority;
  slaMinutes: number;
  breachedAt?: Date;        // when breach threshold was crossed
  resolvedAt?: Date;        // when question was completed after breach
  escalated: boolean;
  escalationCount: number;
}

// ── Current SLA status for a question ────────────────────────────────────────

export interface ISlaStatus {
  questionId: string;
  assignmentId?: string;
  priority: AssignmentPriority;
  slaMinutes: number;
  startedAt: Date;
  deadlineAt: Date;         // startedAt + slaMinutes
  isBreached: boolean;
  isWarning: boolean;       // past warning threshold but not yet breached
  breachLevel: 'ok' | 'warning' | 'breached';
}

// ── SLA config document (singleton) ───────────────────────────────────────────

export interface ISlaConfig {
  _id?: string;
  tiers: SlaTier[];
  checkIntervalSeconds: number;   // how often the SLA cron runs
  autoEscalate: boolean;
}

// ── Default SLA config ────────────────────────────────────────────────────────

export const DEFAULT_SLA_TIERS: SlaTier[] = [
  { priority: 'high',   targetMinutes: 30,  warningMinutes: 20, escalateTo: undefined },
  { priority: 'medium', targetMinutes: 120, warningMinutes: 90, escalateTo: undefined },
  { priority: 'low',    targetMinutes: 480, warningMinutes: 360, escalateTo: undefined },
];

export const DEFAULT_SLA_CONFIG: ISlaConfig = {
  tiers: DEFAULT_SLA_TIERS,
  checkIntervalSeconds: 60,
  autoEscalate: true,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSlaTier(
  config: ISlaConfig,
  priority: AssignmentPriority,
): SlaTier {
  return (
    config.tiers.find((t) => t.priority === priority) ??
    DEFAULT_SLA_TIERS.find((t) => t.priority === priority)!
  );
}

export function computeSlaStatus(
  questionId: string,
  assignmentId: string | undefined,
  priority: AssignmentPriority,
  slaMinutes: number,
  startedAt: Date,
): ISlaStatus {
  const now = new Date();
  const deadlineAt = new Date(startedAt.getTime() + slaMinutes * 60_000);
  const warningAt = new Date(
    startedAt.getTime() + (slaMinutes * 2) / 3 * 60_000,
  );

  const isWarning = now >= warningAt && now < deadlineAt;
  const isBreached = now >= deadlineAt;

  return {
    questionId,
    assignmentId,
    priority,
    slaMinutes,
    startedAt,
    deadlineAt,
    isBreached,
    isWarning,
    breachLevel: isBreached ? 'breached' : isWarning ? 'warning' : 'ok',
  };
}