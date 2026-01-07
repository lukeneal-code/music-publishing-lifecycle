import { AxiosInstance } from 'axios';
import { LoginRequest, LoginResponse, RegisterRequest, User, TokenRefreshRequest, TokenRefreshResponse, WorkListResponse, SimilarSearchRequest, Work, UUID, WorkWithDetails, WorkCreate, WorkUpdate, Recording, RecordingCreate, RecordingUpdate, WorkWriter, WorkWriterCreate, PaginatedResponse, Deal, DealCreate, DealUpdate, Songwriter, RoyaltyPeriod, RoyaltyStatement, RoyaltyLineItem, RoyaltySummary, TopPerformingWork } from '@musicpub/types';

interface ApiClientConfig {
    baseUrl: string;
    getAccessToken?: () => string | null;
    onTokenRefresh?: (newToken: string) => void;
    onUnauthorized?: () => void;
}
declare class ApiClient {
    private client;
    private config;
    constructor(config: ApiClientConfig);
    private handleError;
    get instance(): AxiosInstance;
    get<T>(url: string, params?: object): Promise<T>;
    post<T>(url: string, data?: unknown): Promise<T>;
    put<T>(url: string, data?: unknown): Promise<T>;
    patch<T>(url: string, data?: unknown): Promise<T>;
    delete<T = void>(url: string): Promise<T>;
}
declare function createApiClient(config: ApiClientConfig): ApiClient;

declare class AuthApi {
    private client;
    constructor(client: ApiClient);
    login(credentials: LoginRequest): Promise<LoginResponse>;
    register(data: RegisterRequest): Promise<User>;
    refreshToken(data: TokenRefreshRequest): Promise<TokenRefreshResponse>;
    logout(): Promise<void>;
    getMe(): Promise<User>;
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    confirmPasswordReset(token: string, newPassword: string): Promise<{
        message: string;
    }>;
}

interface ListWorksParams {
    skip?: number;
    limit?: number;
    status?: string;
    search?: string;
    genre?: string;
}
declare class WorksApi {
    private client;
    constructor(client: ApiClient);
    listWorks(params?: ListWorksParams): Promise<WorkListResponse>;
    searchWorks(query: string, params?: {
        skip?: number;
        limit?: number;
    }): Promise<WorkListResponse>;
    searchSimilar(request: SimilarSearchRequest): Promise<Work[]>;
    getWork(id: UUID): Promise<WorkWithDetails>;
    createWork(data: WorkCreate): Promise<Work>;
    updateWork(id: UUID, data: WorkUpdate): Promise<Work>;
    deleteWork(id: UUID): Promise<void>;
    getWorkRecordings(workId: UUID): Promise<Recording[]>;
    createRecording(workId: UUID, data: RecordingCreate): Promise<Recording>;
    getRecording(workId: UUID, recordingId: UUID): Promise<Recording>;
    updateRecording(workId: UUID, recordingId: UUID, data: RecordingUpdate): Promise<Recording>;
    deleteRecording(workId: UUID, recordingId: UUID): Promise<void>;
    getWorkWriters(workId: UUID): Promise<WorkWriter[]>;
    addWorkWriter(workId: UUID, data: WorkWriterCreate): Promise<WorkWriter>;
    removeWorkWriter(workId: UUID, songwriterId: UUID): Promise<void>;
}

interface ListDealsParams {
    skip?: number;
    limit?: number;
    status?: string;
    songwriter_id?: UUID;
    deal_type?: string;
    search?: string;
}
declare class DealsApi {
    private client;
    constructor(client: ApiClient);
    listDeals(params?: ListDealsParams): Promise<PaginatedResponse<Deal>>;
    getDeal(id: UUID): Promise<Deal>;
    createDeal(data: DealCreate): Promise<Deal>;
    updateDeal(id: UUID, data: DealUpdate): Promise<Deal>;
    deleteDeal(id: UUID): Promise<void>;
    getDealWorks(dealId: UUID): Promise<Work[]>;
    addWorkToDeal(dealId: UUID, workId: UUID): Promise<void>;
    removeWorkFromDeal(dealId: UUID, workId: UUID): Promise<void>;
    getSongwriterDeals(songwriterId: UUID): Promise<Deal[]>;
    generateContract(dealId: UUID): Promise<{
        content: string;
        contract_url?: string;
        suggested_special_terms?: string[];
    }>;
    getContract(dealId: UUID): Promise<{
        content: string;
        url?: string;
    }>;
    signDeal(dealId: UUID): Promise<Deal>;
    listSongwriters(params?: {
        skip?: number;
        limit?: number;
        search?: string;
    }): Promise<Songwriter[]>;
}

interface ListPeriodsParams {
    skip?: number;
    limit?: number;
    status?: string;
}
interface ListStatementsParams {
    skip?: number;
    limit?: number;
    status?: string;
    songwriter_id?: UUID;
    period_id?: UUID;
}
declare class RoyaltiesApi {
    private client;
    constructor(client: ApiClient);
    listPeriods(params?: ListPeriodsParams): Promise<PaginatedResponse<RoyaltyPeriod>>;
    getPeriod(id: UUID): Promise<RoyaltyPeriod>;
    createPeriod(data: Partial<RoyaltyPeriod>): Promise<RoyaltyPeriod>;
    calculatePeriod(id: UUID): Promise<{
        message: string;
        statements_count: number;
    }>;
    approvePeriod(id: UUID): Promise<RoyaltyPeriod>;
    listStatements(params?: ListStatementsParams): Promise<PaginatedResponse<RoyaltyStatement>>;
    getStatement(id: UUID): Promise<RoyaltyStatement>;
    getStatementPdf(id: UUID): Promise<Blob>;
    getStatementLineItems(id: UUID): Promise<RoyaltyLineItem[]>;
    getSongwriterRoyalties(songwriterId: UUID): Promise<PaginatedResponse<RoyaltyStatement>>;
    getSongwriterSummary(songwriterId: UUID): Promise<RoyaltySummary>;
    getTopPerformingWorks(songwriterId: UUID, limit?: number): Promise<TopPerformingWork[]>;
}

export { ApiClient, type ApiClientConfig, AuthApi, DealsApi, RoyaltiesApi, WorksApi, createApiClient };
