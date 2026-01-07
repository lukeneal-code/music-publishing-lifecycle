// Music Publishing System - Shared Types

// ============================================
// Common Types
// ============================================

export type UUID = string;

export type UserRole = 'admin' | 'manager' | 'analyst' | 'songwriter' | 'viewer';

export type WorkStatus = 'active' | 'inactive' | 'disputed';

export type DealType =
  | 'publishing'
  | 'co_publishing'
  | 'administration'
  | 'sub_publishing'
  | 'sync_license'
  | 'mechanical_license';

export type DealStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';

export type WriterRole = 'composer' | 'lyricist' | 'composer_lyricist' | 'arranger' | 'adapter';

export type UsageType =
  | 'stream'
  | 'download'
  | 'radio_play'
  | 'tv_broadcast'
  | 'public_performance'
  | 'sync'
  | 'mechanical';

export type MatchMethod =
  | 'isrc_exact'
  | 'iswc_exact'
  | 'title_artist_exact'
  | 'fuzzy_title'
  | 'ai_embedding'
  | 'manual';

export type RoyaltyPeriodStatus = 'open' | 'calculating' | 'calculated' | 'approved' | 'paid';

export type StatementStatus = 'draft' | 'calculated' | 'approved' | 'sent' | 'paid';

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: UUID;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: 'songwriter' | 'viewer';
}

export interface TokenRefreshRequest {
  refresh_token: string;
}

export interface TokenRefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// ============================================
// Songwriter Types
// ============================================

export interface Songwriter {
  id: UUID;
  user_id?: UUID;
  legal_name: string;
  stage_name?: string;
  ipi_number?: string;
  pro_affiliation?: string;
  address?: Address;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

// ============================================
// Work Types
// ============================================

export interface Work {
  id: UUID;
  title: string;
  alternate_titles?: string[];
  iswc?: string;
  language?: string;
  genre?: string;
  release_date?: string;
  duration_seconds?: number;
  status: WorkStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  recordings_count: number;
  writers_count: number;
}

export interface WorkWithDetails extends Work {
  lyrics?: string;
  writers: WorkWriter[];
  recordings: Recording[];
}

export interface WorkCreate {
  title: string;
  alternate_titles?: string[];
  iswc?: string;
  language?: string;
  genre?: string;
  release_date?: string;
  duration_seconds?: number;
  lyrics?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkUpdate {
  title?: string;
  alternate_titles?: string[];
  iswc?: string;
  language?: string;
  genre?: string;
  release_date?: string;
  duration_seconds?: number;
  lyrics?: string;
  metadata?: Record<string, unknown>;
  status?: WorkStatus;
}

export interface WorkListResponse {
  items: Work[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================
// Work Writer Types
// ============================================

export interface WorkWriter {
  id: UUID;
  songwriter_id: UUID;
  writer_role?: WriterRole;
  ownership_share: number;
  created_at: string;
  songwriter?: Songwriter;
}

export interface WorkWriterCreate {
  songwriter_id: UUID;
  writer_role?: WriterRole;
  ownership_share: number;
}

// ============================================
// Recording Types
// ============================================

export interface Recording {
  id: UUID;
  work_id: UUID;
  isrc?: string;
  title: string;
  artist_name?: string;
  version_type?: 'original' | 'remix' | 'live' | 'acoustic';
  duration_seconds?: number;
  release_date?: string;
  label?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RecordingCreate {
  isrc?: string;
  title: string;
  artist_name?: string;
  version_type?: 'original' | 'remix' | 'live' | 'acoustic';
  duration_seconds?: number;
  release_date?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordingUpdate {
  isrc?: string;
  title?: string;
  artist_name?: string;
  version_type?: string;
  duration_seconds?: number;
  release_date?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Deal Types
// ============================================

export interface Deal {
  id: UUID;
  deal_number: string;
  songwriter_id: UUID;
  deal_type: DealType;
  status: DealStatus;
  advance_amount: number;
  advance_recouped: number;
  publisher_share: number;
  writer_share: number;
  effective_date: string;
  expiration_date?: string;
  term_months?: number;
  territories: string[];
  rights_granted: string[];
  created_at: string;
  updated_at: string;
  songwriter?: Songwriter;
}

export interface DealCreate {
  deal_number: string;
  songwriter_id: UUID;
  deal_type: DealType;
  advance_amount?: number;
  publisher_share: number;
  writer_share: number;
  effective_date: string;
  expiration_date?: string;
  term_months?: number;
  territories?: string[];
  rights_granted?: string[];
}

export interface DealUpdate {
  status?: DealStatus;
  advance_amount?: number;
  advance_recouped?: number;
  publisher_share?: number;
  writer_share?: number;
  expiration_date?: string;
  territories?: string[];
}

// ============================================
// Royalty Types
// ============================================

export interface RoyaltyPeriod {
  id: UUID;
  period_code: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  start_date: string;
  end_date: string;
  status: RoyaltyPeriodStatus;
  calculation_started_at?: string;
  calculation_completed_at?: string;
  approved_at?: string;
  created_at: string;
}

export interface RoyaltyStatement {
  id: UUID;
  period_id: UUID;
  songwriter_id: UUID;
  gross_royalties: number;
  publisher_share: number;
  writer_share: number;
  advance_recoupment: number;
  withholding_tax: number;
  other_deductions: number;
  net_payable: number;
  status: StatementStatus;
  payment_date?: string;
  payment_reference?: string;
  statement_pdf_url?: string;
  created_at: string;
  updated_at: string;
  period?: RoyaltyPeriod;
  songwriter?: Songwriter;
}

export interface RoyaltyLineItem {
  id: UUID;
  statement_id: UUID;
  deal_id: UUID;
  work_id: UUID;
  usage_type: UsageType;
  territory?: string;
  source?: string;
  usage_count: number;
  gross_revenue: number;
  publisher_rate: number;
  calculated_royalty: number;
  work?: Work;
}

export interface RoyaltySummary {
  current_quarter_earnings: number;
  quarter_change?: number;
  ytd_earnings: number;
  active_works_count: number;
  pending_payout: number;
  next_payment_date?: string;
  monthly_earnings: { month: string; amount: number }[];
  revenue_by_source: { source: string; amount: number; percentage: number }[];
}

// ============================================
// Usage Types
// ============================================

export interface UsageEvent {
  id: UUID;
  source: string;
  source_event_id?: string;
  isrc?: string;
  reported_title: string;
  reported_artist?: string;
  reported_album?: string;
  usage_type: UsageType;
  play_count: number;
  revenue_amount?: number;
  currency: string;
  territory?: string;
  usage_date: string;
  reporting_period: string;
  processing_status: 'pending' | 'processing' | 'matched' | 'unmatched' | 'disputed' | 'error';
  ingested_at: string;
  processed_at?: string;
}

export interface MatchedUsage {
  id: UUID;
  usage_event_id: UUID;
  work_id: UUID;
  recording_id?: UUID;
  match_confidence: number;
  match_method: MatchMethod;
  matched_by: string;
  is_confirmed: boolean;
  matched_at: string;
  work?: Work;
  recording?: Recording;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

// ============================================
// Search Types
// ============================================

export interface SimilarSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

export interface TopPerformingWork extends Work {
  total_plays: number;
  total_royalties: number;
}
