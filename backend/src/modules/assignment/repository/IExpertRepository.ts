import { IExpert, IExpertPerformance, ExpertState } from '../expert.js';

export interface IExpertRepository {
  // ── Expert CRUD ──────────────────────────────────────────────────────────

  create(data: Partial<IExpert>): Promise<IExpert>;
  findById(id: string): Promise<IExpert | null>;
  findByUserId(userId: string): Promise<IExpert | null>;
  update(id: string, data: Partial<IExpert>): Promise<IExpert | null>;
  delete(id: string): Promise<boolean>;

  // ── State & availability ──────────────────────────────────────────────────

  findByState(state: ExpertState): Promise<IExpert[]>;
  findAvailable(): Promise<IExpert[]>;
  updateState(id: string, state: ExpertState): Promise<IExpert | null>;

  // ── Skill matching ────────────────────────────────────────────────────────

  findByDomain(domain: string): Promise<IExpert[]>;
  findBySkills(domains: string[]): Promise<IExpert[]>;

  // ── Performance ───────────────────────────────────────────────────────────

  upsertPerformance(expertId: string, domain: string, data: Partial<IExpertPerformance>): Promise<IExpertPerformance>;
  getPerformance(expertId: string, domain: string): Promise<IExpertPerformance | null>;
  getTopPerformers(domain: string, limit: number): Promise<IExpertPerformance[]>;
}