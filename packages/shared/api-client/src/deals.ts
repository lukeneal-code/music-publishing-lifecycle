import type {
  Deal,
  DealCreate,
  DealUpdate,
  Work,
  UUID,
  PaginatedResponse,
} from '@musicpub/types';
import { ApiClient } from './client';

export interface ListDealsParams {
  skip?: number;
  limit?: number;
  status?: string;
  songwriter_id?: UUID;
  deal_type?: string;
}

export class DealsApi {
  constructor(private client: ApiClient) {}

  async listDeals(params?: ListDealsParams): Promise<PaginatedResponse<Deal>> {
    return this.client.get<PaginatedResponse<Deal>>('/deals', params);
  }

  async getDeal(id: UUID): Promise<Deal> {
    return this.client.get<Deal>(`/deals/${id}`);
  }

  async createDeal(data: DealCreate): Promise<Deal> {
    return this.client.post<Deal>('/deals', data);
  }

  async updateDeal(id: UUID, data: DealUpdate): Promise<Deal> {
    return this.client.put<Deal>(`/deals/${id}`, data);
  }

  async deleteDeal(id: UUID): Promise<void> {
    return this.client.delete(`/deals/${id}`);
  }

  // Deal Works
  async getDealWorks(dealId: UUID): Promise<Work[]> {
    return this.client.get<Work[]>(`/deals/${dealId}/works`);
  }

  async addWorkToDeal(dealId: UUID, workId: UUID): Promise<void> {
    return this.client.post(`/deals/${dealId}/works`, { work_id: workId });
  }

  async removeWorkFromDeal(dealId: UUID, workId: UUID): Promise<void> {
    return this.client.delete(`/deals/${dealId}/works/${workId}`);
  }

  // Songwriter deals
  async getSongwriterDeals(songwriterId: UUID): Promise<Deal[]> {
    return this.client.get<Deal[]>(`/songwriters/${songwriterId}/deals`);
  }

  // Contract generation
  async generateContract(dealId: UUID): Promise<{ contract_url: string }> {
    return this.client.post(`/deals/${dealId}/generate-contract`);
  }

  async getContract(dealId: UUID): Promise<{ content: string; url?: string }> {
    return this.client.get(`/deals/${dealId}/contract`);
  }

  async signDeal(dealId: UUID): Promise<Deal> {
    return this.client.post(`/deals/${dealId}/sign`);
  }
}
