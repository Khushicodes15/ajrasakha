import { AssignmentPriority } from './types.js';
import { ExpertState } from './expert.js';

// ── All possible audit event types ────────────────────────────────────────────

export type AuditEventType =
  // Assignment lifecycle
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_COMPLETED'
  | 'ASSIGNMENT_REMOVED'
  | 'ASSIGNMENT_REASSIGNED'
  // Queue events
  | 'QUESTION_QUEUED'
  | 'QUESTION_DEQUEUED'
  | 'QUEUE_FROZEN'
  | 'QUEUE_UNFROZEN'
  // Expert state transitions
  | 'EXPERT_STATE_CHANGED'
  // SLA events
  | 'SLA_WARNING'
  | 'SLA_BREACH'
  | 'SLA_ESCALATION'
  | 'SLA_RESOLVED'
  // Review actions
  | 'REVIEW_SUBMITTED'
  | 'REVIEW_APPROVED'
  | 'REVIEW_REJECTED'
  | 'REVISION_REQUESTED'
  // Manual admin actions
  | 'ADMIN_FORCE_ASSIGN'
  | 'ADMIN_FORCE_REASSIGN'
  | 'ADMIN_FREEZE_QUEUE'
  | 'ADMIN_UNFREEZE_QUEUE'
  | 'ADMIN_PRIORITIZE_OVERRIDE';

// ── Audit event record ────────────────────────────────────────────────────────

export interface IAuditEvent {
  _id?: string;
  eventType: AuditEventType;
  questionId?: string;
  assignmentId?: string;
  expertId?: string;
  performedBy?: string;       // userId of admin/actor
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ── Snapshot for state-change events ─────────────────────────────────────────

export interface StateChangeMeta {
  previousState: ExpertState;
  newState: ExpertState;
}

export interface ReassignmentMeta {
  previousExpertId: string;
  newExpertId: string;
  reason: string;
}

export interface SlaBreachMeta {
  priority: AssignmentPriority;
  slaMinutes: number;
  overdueMinutes: number;
  escalatedTo?: string;
}