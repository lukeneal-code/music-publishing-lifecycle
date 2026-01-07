import type { UUID } from '@musicpub/types';
import { ApiClient } from './client';

export interface RawUsageEvent {
  source_event_id?: string;
  isrc?: string;
  title?: string;
  artist?: string;
  album?: string;
  usage_type?: string;
  play_count?: number;
  revenue_amount?: number;
  currency?: string;
  territory?: string;
  usage_date: string;
  reporting_period?: string;
}

export interface UsageIngestRequest {
  events: RawUsageEvent[];
  source: string;
}

export interface UsageIngestResponse {
  message: string;
  events_received: number;
  events_queued: number;
}

export interface UsageEvent {
  id: string;
  source: string;
  isrc?: string;
  reported_title?: string;
  reported_artist?: string;
  usage_type: string;
  play_count: number;
  revenue_amount?: number;
  territory?: string;
  usage_date: string;
  processing_status: string;
  ingested_at: string;
}

export interface UnmatchedListResponse {
  items: UsageEvent[];
  total: number;
  skip: number;
  limit: number;
}

export interface ManualMatchRequest {
  usage_event_id: string;
  work_id: string;
  recording_id?: string;
}

export interface ManualMatchResponse {
  message: string;
  usage_event_id: string;
  work_id: string;
  match_method: string;
}

export interface UsageStats {
  total_events: number;
  matched_count: number;
  unmatched_count: number;
  pending_count: number;
  error_count: number;
  match_rate: number;
  by_source: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ListUnmatchedParams {
  skip?: number;
  limit?: number;
  source?: string;
  territory?: string;
}

export class UsageApi {
  constructor(private client: ApiClient) {}

  async ingestUsage(request: UsageIngestRequest): Promise<UsageIngestResponse> {
    return this.client.post<UsageIngestResponse>('usage/ingest', request);
  }

  async listUnmatched(params?: ListUnmatchedParams): Promise<UnmatchedListResponse> {
    return this.client.get<UnmatchedListResponse>('usage/unmatched', params);
  }

  async getUsageEvent(eventId: string): Promise<UsageEvent> {
    return this.client.get<UsageEvent>(`usage/${eventId}`);
  }

  async manualMatch(request: ManualMatchRequest): Promise<ManualMatchResponse> {
    return this.client.post<ManualMatchResponse>('usage/manual-match', request);
  }

  async getStats(): Promise<UsageStats> {
    return this.client.get<UsageStats>('usage/stats');
  }
}
