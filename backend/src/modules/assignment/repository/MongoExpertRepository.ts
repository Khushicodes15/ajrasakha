import { ObjectId } from 'mongodb';
import { injectable, inject } from 'inversify';
import { GLOBAL_TYPES } from '#root/types.js';
import { MongoDatabase } from '#shared/database/providers/mongo/MongoDatabase.js';
import { IExpertRepository } from './IExpertRepository.js';
import { IExpert, IExpertPerformance, ExpertState } from '../expert.js';

const COLLECTION_EXPERT = 'experts';
const COLLECTION_PERF   = 'expert_performance';

@injectable()
export class MongoExpertRepository implements IExpertRepository {
  constructor(
    @inject(GLOBAL_TYPES.Database)
    private readonly db: MongoDatabase,
  ) {}

  private async coll() {
    return this.db.getCollection<IExpert>(COLLECTION_EXPERT);
  }

  private async perfColl() {
    return this.db.getCollection<IExpertPerformance>(COLLECTION_PERF);
  }

  private format(doc: IExpert | null): IExpert | null {
    if (!doc) return doc;
    return {
      ...doc,
      _id: (doc._id as unknown as ObjectId).toString(),
    } as IExpert;
  }

  // ── Expert CRUD ──────────────────────────────────────────────────────────────

  async create(data: Partial<IExpert>): Promise<IExpert> {
    const col = await this.coll();
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() } as IExpert;
    const result = await col.insertOne(doc as any);
    return { ...doc, _id: (result.insertedId as any).toString() } as IExpert;
  }

  async findById(id: string): Promise<IExpert | null> {
    const col = await this.coll();
    const doc = await col.findOne({ _id: new ObjectId(id) } as any);
    return this.format(doc as IExpert | null);
  }

  async findByUserId(userId: string): Promise<IExpert | null> {
    const col = await this.coll();
    const doc = await col.findOne({ userId } as any);
    return this.format(doc as IExpert | null);
  }

  async update(id: string, data: Partial<IExpert>): Promise<IExpert | null> {
    const col = await this.coll();
    const doc = await col.findOneAndUpdate(
      { _id: new ObjectId(id) } as any,
      { $set: { ...data, updatedAt: new Date() } } as any,
      { returnDocument: 'after' } as any,
    ) as any;
    return this.format(doc as IExpert | null);
  }

  async delete(id: string): Promise<boolean> {
    const col = await this.coll();
    const result = await col.deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount === 1;
  }

  // ── State & availability ─────────────────────────────────────────────────────

  async findByState(state: ExpertState): Promise<IExpert[]> {
    const col = await this.coll();
    const docs = await col.find({ state, isActive: true } as any).toArray();
    return docs.map((d) => this.format(d as IExpert)!);
  }

  async findAvailable(): Promise<IExpert[]> {
    return this.findByState('available');
  }

  async updateState(id: string, state: ExpertState): Promise<IExpert | null> {
    return this.update(id, { state } as Partial<IExpert>);
  }

  // ── Skill matching ───────────────────────────────────────────────────────────

  async findByDomain(domain: string): Promise<IExpert[]> {
    const col = await this.coll();
    const docs = await col
      .find({ 'skills.domain': domain, isActive: true } as any)
      .toArray();
    return docs.map((d) => this.format(d as IExpert)!);
  }

  async findBySkills(domains: string[]): Promise<IExpert[]> {
    const col = await this.coll();
    const docs = await col
      .find({ 'skills.domain': { $in: domains }, isActive: true } as any)
      .toArray();
    return docs.map((d) => this.format(d as IExpert)!);
  }

  // ── Performance ──────────────────────────────────────────────────────────────

  async upsertPerformance(
    expertId: string,
    domain: string,
    data: Partial<IExpertPerformance>,
  ): Promise<IExpertPerformance> {
    const col = await this.perfColl();
    const result = await col.findOneAndUpdate(
      { expertId, domain } as any,
      { $set: { ...data, expertId, domain } } as any,
      { upsert: true, returnDocument: 'after' } as any,
    ) as any;
    return result as IExpertPerformance;
  }

  async getPerformance(expertId: string, domain: string): Promise<IExpertPerformance | null> {
    const col = await this.perfColl();
    return col.findOne({ expertId, domain } as any) as Promise<IExpertPerformance | null>;
  }

  async getTopPerformers(domain: string, limit: number): Promise<IExpertPerformance[]> {
    const col = await this.perfColl();
    const docs = await col
      .find({ domain } as any)
      .sort({ accuracyScore: -1, avgReviewTimeMinutes: 1 })
      .limit(limit)
      .toArray();
    return docs as IExpertPerformance[];
  }
}