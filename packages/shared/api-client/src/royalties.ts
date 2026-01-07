import type {
  RoyaltyPeriod,
  RoyaltyStatement,
  RoyaltyLineItem,
  RoyaltySummary,
  TopPerformingWork,
  UUID,
  PaginatedResponse,
} from '@musicpub/types';
import { ApiClient } from './client';

export interface ListPeriodsParams {
  skip?: number;
  limit?: number;
  status?: string;
}

export interface ListStatementsParams {
  skip?: number;
  limit?: number;
  status?: string;
  songwriter_id?: UUID;
  period_id?: UUID;
}

export class RoyaltiesApi {
  constructor(private client: ApiClient) {}

  // Periods
  async listPeriods(params?: ListPeriodsParams): Promise<PaginatedResponse<RoyaltyPeriod>> {
    return this.client.get<PaginatedResponse<RoyaltyPeriod>>('/royalties/periods', params);
  }

  async getPeriod(id: UUID): Promise<RoyaltyPeriod> {
    return this.client.get<RoyaltyPeriod>(`/royalties/periods/${id}`);
  }

  async createPeriod(data: Partial<RoyaltyPeriod>): Promise<RoyaltyPeriod> {
    return this.client.post<RoyaltyPeriod>('/royalties/periods', data);
  }

  async calculatePeriod(id: UUID): Promise<{ message: string; statements_count: number }> {
    return this.client.post(`/royalties/periods/${id}/calculate`);
  }

  async approvePeriod(id: UUID): Promise<RoyaltyPeriod> {
    return this.client.post(`/royalties/periods/${id}/approve`);
  }

  // Statements
  async listStatements(params?: ListStatementsParams): Promise<PaginatedResponse<RoyaltyStatement>> {
    return this.client.get<PaginatedResponse<RoyaltyStatement>>('/royalties/statements', params);
  }

  async getStatement(id: UUID): Promise<RoyaltyStatement> {
    return this.client.get<RoyaltyStatement>(`/royalties/statements/${id}`);
  }

  async getStatementPdf(id: UUID): Promise<Blob> {
    const response = await this.client.instance.get(`/royalties/statements/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getStatementLineItems(id: UUID): Promise<RoyaltyLineItem[]> {
    return this.client.get<RoyaltyLineItem[]>(`/royalties/statements/${id}/line-items`);
  }

  // Songwriter royalties
  async getSongwriterRoyalties(songwriterId: UUID): Promise<PaginatedResponse<RoyaltyStatement>> {
    return this.client.get<PaginatedResponse<RoyaltyStatement>>(`/songwriters/${songwriterId}/royalties`);
  }

  async getSongwriterSummary(songwriterId: UUID): Promise<RoyaltySummary> {
    return this.client.get<RoyaltySummary>(`/songwriters/${songwriterId}/royalties/summary`);
  }

  async getTopPerformingWorks(songwriterId: UUID, limit?: number): Promise<TopPerformingWork[]> {
    return this.client.get<TopPerformingWork[]>(`/songwriters/${songwriterId}/works/top`, { limit });
  }
}
