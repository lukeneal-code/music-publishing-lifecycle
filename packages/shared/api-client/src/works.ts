import type {
  Work,
  WorkCreate,
  WorkUpdate,
  WorkWithDetails,
  WorkListResponse,
  Recording,
  RecordingCreate,
  RecordingUpdate,
  WorkWriter,
  WorkWriterCreate,
  SimilarSearchRequest,
  UUID,
} from '@musicpub/types';
import { ApiClient } from './client';

export interface ListWorksParams {
  skip?: number;
  limit?: number;
  status?: string;
  search?: string;
  genre?: string;
}

export class WorksApi {
  constructor(private client: ApiClient) {}

  // Works
  async listWorks(params?: ListWorksParams): Promise<WorkListResponse> {
    return this.client.get<WorkListResponse>('works', params);
  }

  async searchWorks(query: string, params?: { skip?: number; limit?: number }): Promise<WorkListResponse> {
    return this.client.get<WorkListResponse>('works/search', { q: query, ...params });
  }

  async searchSimilar(request: SimilarSearchRequest): Promise<Work[]> {
    return this.client.post<Work[]>('works/search/similar', request);
  }

  async getWork(id: UUID): Promise<WorkWithDetails> {
    return this.client.get<WorkWithDetails>(`works/${id}`);
  }

  async createWork(data: WorkCreate): Promise<Work> {
    return this.client.post<Work>('works', data);
  }

  async updateWork(id: UUID, data: WorkUpdate): Promise<Work> {
    return this.client.put<Work>(`works/${id}`, data);
  }

  async deleteWork(id: UUID): Promise<void> {
    return this.client.delete(`works/${id}`);
  }

  // Recordings
  async getWorkRecordings(workId: UUID): Promise<Recording[]> {
    return this.client.get<Recording[]>(`works/${workId}/recordings`);
  }

  async createRecording(workId: UUID, data: RecordingCreate): Promise<Recording> {
    return this.client.post<Recording>(`works/${workId}/recordings`, data);
  }

  async getRecording(workId: UUID, recordingId: UUID): Promise<Recording> {
    return this.client.get<Recording>(`works/${workId}/recordings/${recordingId}`);
  }

  async updateRecording(workId: UUID, recordingId: UUID, data: RecordingUpdate): Promise<Recording> {
    return this.client.put<Recording>(`works/${workId}/recordings/${recordingId}`, data);
  }

  async deleteRecording(workId: UUID, recordingId: UUID): Promise<void> {
    return this.client.delete(`works/${workId}/recordings/${recordingId}`);
  }

  // Writers
  async getWorkWriters(workId: UUID): Promise<WorkWriter[]> {
    return this.client.get<WorkWriter[]>(`works/${workId}/writers`);
  }

  async addWorkWriter(workId: UUID, data: WorkWriterCreate): Promise<WorkWriter> {
    return this.client.post<WorkWriter>(`works/${workId}/writers`, data);
  }

  async removeWorkWriter(workId: UUID, songwriterId: UUID): Promise<void> {
    return this.client.delete(`works/${workId}/writers/${songwriterId}`);
  }
}
