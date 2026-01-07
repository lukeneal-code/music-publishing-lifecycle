-- Music Publishing System - Seed Data for Development
-- This file contains test data for development and testing

-- ============================================
-- USERS
-- ============================================
-- Password: "password123" (bcrypt hashed)
INSERT INTO users (id, email, password_hash, role, is_active) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@musicpub.com', '$2b$12$YQ.Y7ED15P3QrdH7mZoKsuND7c3p23NUqLNhbKbKRN5VBVZy2Nj.a', 'admin', true),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'manager@musicpub.com', '$2b$12$YQ.Y7ED15P3QrdH7mZoKsuND7c3p23NUqLNhbKbKRN5VBVZy2Nj.a', 'manager', true),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'analyst@musicpub.com', '$2b$12$YQ.Y7ED15P3QrdH7mZoKsuND7c3p23NUqLNhbKbKRN5VBVZy2Nj.a', 'analyst', true),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'songwriter1@email.com', '$2b$12$YQ.Y7ED15P3QrdH7mZoKsuND7c3p23NUqLNhbKbKRN5VBVZy2Nj.a', 'songwriter', true),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'songwriter2@email.com', '$2b$12$YQ.Y7ED15P3QrdH7mZoKsuND7c3p23NUqLNhbKbKRN5VBVZy2Nj.a', 'songwriter', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SONGWRITERS
-- ============================================
INSERT INTO songwriters (id, user_id, legal_name, stage_name, ipi_number, pro_affiliation, address) VALUES
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'John Smith', 'Johnny Beats', '00123456789', 'ASCAP', '{"street": "123 Music Lane", "city": "Nashville", "state": "TN", "zip": "37203", "country": "US"}'),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Sarah Johnson', 'S.J. Melody', '00987654321', 'BMI', '{"street": "456 Songwriter Ave", "city": "Los Angeles", "state": "CA", "zip": "90028", "country": "US"}'),
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NULL, 'Michael Williams', NULL, '00555666777', 'SESAC', '{"street": "789 Harmony Blvd", "city": "Austin", "state": "TX", "zip": "78701", "country": "US"}'),
    ('40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', NULL, 'Emily Davis', 'Em D', '00111222333', 'ASCAP', '{"street": "321 Tune Street", "city": "New York", "state": "NY", "zip": "10001", "country": "US"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- WORKS
-- ============================================
INSERT INTO works (id, title, alternate_titles, iswc, language, genre, release_date, duration_seconds, status) VALUES
    ('50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Midnight Dreams', ARRAY['Dreams at Midnight', 'Midnight Reverie'], 'T-123.456.789-0', 'en', 'Pop', '2023-06-15', 215, 'active'),
    ('60eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Summer Love', ARRAY['Love in Summer'], 'T-234.567.890-1', 'en', 'Pop', '2023-08-01', 198, 'active'),
    ('70eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'City Lights', NULL, 'T-345.678.901-2', 'en', 'R&B', '2023-09-20', 242, 'active'),
    ('80eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'Heartbreak Hotel', ARRAY['Hotel Heartbreak'], 'T-456.789.012-3', 'en', 'Country', '2023-04-10', 227, 'active'),
    ('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'Dancing in the Rain', NULL, 'T-567.890.123-4', 'en', 'Pop', '2024-01-15', 203, 'active'),
    ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'Forever Young', ARRAY['Young Forever'], NULL, 'en', 'Rock', '2024-02-28', 268, 'active'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'Sunset Boulevard', NULL, 'T-678.901.234-5', 'en', 'Jazz', '2023-11-05', 312, 'active'),
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'Electric Soul', ARRAY['Soul Electric'], 'T-789.012.345-6', 'en', 'Electronic', '2024-03-10', 186, 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- WORK WRITERS
-- ============================================
INSERT INTO work_writers (work_id, songwriter_id, writer_role, ownership_share) VALUES
    -- Midnight Dreams: John (60%) + Sarah (40%)
    ('50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'composer_lyricist', 60.00),
    ('50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'composer', 40.00),

    -- Summer Love: Sarah (100%)
    ('60eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'composer_lyricist', 100.00),

    -- City Lights: John (50%) + Michael (50%)
    ('70eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'composer', 50.00),
    ('70eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'lyricist', 50.00),

    -- Heartbreak Hotel: Emily (100%)
    ('80eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'composer_lyricist', 100.00),

    -- Dancing in the Rain: John (33.33%) + Sarah (33.33%) + Emily (33.34%)
    ('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'composer', 33.33),
    ('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'composer', 33.33),
    ('90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'lyricist', 33.34),

    -- Forever Young: Michael (100%)
    ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'composer_lyricist', 100.00),

    -- Sunset Boulevard: Sarah (70%) + Michael (30%)
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'composer', 70.00),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'arranger', 30.00),

    -- Electric Soul: John (100%)
    ('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'composer_lyricist', 100.00)
ON CONFLICT (work_id, songwriter_id) DO NOTHING;

-- ============================================
-- RECORDINGS
-- ============================================
INSERT INTO recordings (id, work_id, isrc, title, artist_name, version_type, duration_seconds, release_date, label) VALUES
    -- Midnight Dreams recordings
    ('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'USRC12345678', 'Midnight Dreams', 'Johnny Beats', 'original', 215, '2023-06-15', 'Universal Music'),
    ('d2eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'USRC12345679', 'Midnight Dreams (Acoustic)', 'Johnny Beats', 'acoustic', 225, '2023-07-01', 'Universal Music'),

    -- Summer Love recordings
    ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', '60eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'USRC23456789', 'Summer Love', 'S.J. Melody', 'original', 198, '2023-08-01', 'Sony Music'),
    ('e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', '60eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'USRC23456790', 'Summer Love (Club Mix)', 'S.J. Melody ft. DJ Max', 'remix', 312, '2023-09-15', 'Sony Music'),

    -- City Lights recording
    ('f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', '70eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'USRC34567890', 'City Lights', 'Urban Collective', 'original', 242, '2023-09-20', 'Atlantic Records'),

    -- Heartbreak Hotel recording
    ('f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', '80eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'USRC45678901', 'Heartbreak Hotel', 'Em D', 'original', 227, '2023-04-10', 'Warner Music'),

    -- Dancing in the Rain recording
    ('f3eebc99-9c0b-4ef8-bb6d-6bb9bd380a47', '90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'USRC56789012', 'Dancing in the Rain', 'The Trio', 'original', 203, '2024-01-15', 'Independent'),

    -- Forever Young recording
    ('f4eebc99-9c0b-4ef8-bb6d-6bb9bd380a48', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a36', 'USRC67890123', 'Forever Young', 'Rock Revival', 'original', 268, '2024-02-28', 'Capitol Records'),

    -- Sunset Boulevard recording
    ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a49', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a37', 'USRC78901234', 'Sunset Boulevard', 'Jazz Ensemble', 'original', 312, '2023-11-05', 'Blue Note'),

    -- Electric Soul recording
    ('f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a50', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a38', 'USRC89012345', 'Electric Soul', 'Johnny Beats', 'original', 186, '2024-03-10', 'Spinnin Records')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEALS
-- ============================================
INSERT INTO deals (id, deal_number, songwriter_id, deal_type, status, advance_amount, advance_recouped, publisher_share, writer_share, effective_date, expiration_date, term_months, territories, created_by) VALUES
    ('01eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'DEAL-2023-001', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'publishing', 'active', 50000.00, 15000.00, 50.00, 50.00, '2023-01-01', '2025-12-31', 36, ARRAY['US', 'CA', 'UK', 'DE', 'FR'], 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('02eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'DEAL-2023-002', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'co_publishing', 'active', 75000.00, 25000.00, 40.00, 60.00, '2023-03-15', '2026-03-14', 36, ARRAY['WORLD'], 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('03eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'DEAL-2023-003', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'administration', 'active', 0.00, 0.00, 15.00, 85.00, '2023-06-01', '2028-05-31', 60, ARRAY['WORLD'], 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    ('04eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'DEAL-2024-001', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 'publishing', 'active', 30000.00, 0.00, 50.00, 50.00, '2024-01-01', '2026-12-31', 36, ARRAY['US', 'CA'], 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEAL WORKS
-- ============================================
INSERT INTO deal_works (deal_id, work_id) VALUES
    -- John's deal covers his works
    ('01eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31'),
    ('01eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', '70eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
    ('01eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', '90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35'),
    ('01eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a38'),

    -- Sarah's deal
    ('02eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31'),
    ('02eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', '60eebc99-9c0b-4ef8-bb6d-6bb9bd380a32'),
    ('02eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', '90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35'),
    ('02eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a37'),

    -- Michael's deal
    ('03eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', '70eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
    ('03eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a36'),
    ('03eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a37'),

    -- Emily's deal
    ('04eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', '80eebc99-9c0b-4ef8-bb6d-6bb9bd380a34'),
    ('04eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', '90eebc99-9c0b-4ef8-bb6d-6bb9bd380a35')
ON CONFLICT (deal_id, work_id) DO NOTHING;

-- ============================================
-- ROYALTY PERIODS
-- ============================================
INSERT INTO royalty_periods (id, period_code, period_type, start_date, end_date, status) VALUES
    ('aa1ebc99-9c0b-4ef8-bb6d-6bb9bd380a61', '2023_Q3', 'quarterly', '2023-07-01', '2023-09-30', 'paid'),
    ('aa2ebc99-9c0b-4ef8-bb6d-6bb9bd380a62', '2023_Q4', 'quarterly', '2023-10-01', '2023-12-31', 'approved'),
    ('aa3ebc99-9c0b-4ef8-bb6d-6bb9bd380a63', '2024_Q1', 'quarterly', '2024-01-01', '2024-03-31', 'calculated'),
    ('aa4ebc99-9c0b-4ef8-bb6d-6bb9bd380a64', '2024_Q2', 'quarterly', '2024-04-01', '2024-06-30', 'open')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USAGE EVENTS (Sample streaming data)
-- ============================================
INSERT INTO usage_events (id, source, source_event_id, isrc, reported_title, reported_artist, usage_type, play_count, revenue_amount, currency, territory, usage_date, reporting_period, processing_status) VALUES
    -- Spotify streams
    ('bb1ebc99-9c0b-4ef8-bb6d-6bb9bd380a71', 'spotify', 'sp_001', 'USRC12345678', 'Midnight Dreams', 'Johnny Beats', 'stream', 1500000, 4500.00, 'USD', 'US', '2024-01-15', '2024_Q1', 'matched'),
    ('bb2ebc99-9c0b-4ef8-bb6d-6bb9bd380a72', 'spotify', 'sp_002', 'USRC23456789', 'Summer Love', 'S.J. Melody', 'stream', 2000000, 6000.00, 'USD', 'US', '2024-01-20', '2024_Q1', 'matched'),
    ('bb3ebc99-9c0b-4ef8-bb6d-6bb9bd380a73', 'spotify', 'sp_003', 'USRC34567890', 'City Lights', 'Urban Collective', 'stream', 800000, 2400.00, 'USD', 'UK', '2024-02-01', '2024_Q1', 'matched'),

    -- Apple Music streams
    ('bb4ebc99-9c0b-4ef8-bb6d-6bb9bd380a74', 'apple_music', 'am_001', 'USRC12345678', 'Midnight Dreams', 'Johnny Beats', 'stream', 900000, 3600.00, 'USD', 'US', '2024-01-25', '2024_Q1', 'matched'),
    ('bb5ebc99-9c0b-4ef8-bb6d-6bb9bd380a75', 'apple_music', 'am_002', 'USRC45678901', 'Heartbreak Hotel', 'Em D', 'stream', 500000, 2000.00, 'USD', 'CA', '2024-02-10', '2024_Q1', 'matched'),

    -- Radio plays
    ('bb6ebc99-9c0b-4ef8-bb6d-6bb9bd380a76', 'radio', 'rad_001', NULL, 'Summer Love', 'SJ Melody', 'radio_play', 150, 750.00, 'USD', 'US', '2024-02-15', '2024_Q1', 'pending'),
    ('bb7ebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'radio', 'rad_002', NULL, 'Midnight Dream', 'Johnny Beat', 'radio_play', 200, 1000.00, 'USD', 'US', '2024-03-01', '2024_Q1', 'pending')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- MATCHED USAGE
-- ============================================
INSERT INTO matched_usage (usage_event_id, work_id, recording_id, match_confidence, match_method, matched_by) VALUES
    ('bb1ebc99-9c0b-4ef8-bb6d-6bb9bd380a71', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 1.0000, 'isrc_exact', 'system'),
    ('bb2ebc99-9c0b-4ef8-bb6d-6bb9bd380a72', '60eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 1.0000, 'isrc_exact', 'system'),
    ('bb3ebc99-9c0b-4ef8-bb6d-6bb9bd380a73', '70eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 1.0000, 'isrc_exact', 'system'),
    ('bb4ebc99-9c0b-4ef8-bb6d-6bb9bd380a74', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 1.0000, 'isrc_exact', 'system'),
    ('bb5ebc99-9c0b-4ef8-bb6d-6bb9bd380a75', '80eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'f2eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', 1.0000, 'isrc_exact', 'system')
ON CONFLICT (usage_event_id, work_id) DO NOTHING;

-- ============================================
-- CONTRACT TEMPLATES
-- ============================================
INSERT INTO contract_templates (id, name, deal_type, template_content, template_variables, is_active) VALUES
    ('cc1ebc99-9c0b-4ef8-bb6d-6bb9bd380a81', 'Standard Publishing Agreement', 'publishing',
    'MUSIC PUBLISHING AGREEMENT

This Agreement is entered into as of {{effective_date}} between:

PUBLISHER: Music Publishing Company ("Publisher")
WRITER: {{songwriter_name}} ("Writer")

1. GRANT OF RIGHTS
Writer hereby grants to Publisher the exclusive rights to the musical compositions listed in Schedule A...

2. TERRITORY
This Agreement covers the following territories: {{territories}}

3. TERM
The term of this Agreement shall be {{term_months}} months from the Effective Date.

4. COMPENSATION
Publisher Share: {{publisher_share}}%
Writer Share: {{writer_share}}%
Advance: ${{advance_amount}}

5. ROYALTY PAYMENTS
Royalties shall be calculated and paid quarterly...

[Template continues...]',
    '{"required": ["effective_date", "songwriter_name", "territories", "term_months", "publisher_share", "writer_share", "advance_amount"], "optional": ["special_terms"]}',
    true),

    ('cc2ebc99-9c0b-4ef8-bb6d-6bb9bd380a82', 'Co-Publishing Agreement', 'co_publishing',
    'CO-PUBLISHING AGREEMENT

This Co-Publishing Agreement is entered into as of {{effective_date}}...

[Template content for co-publishing deals...]',
    '{"required": ["effective_date", "songwriter_name", "publisher_share", "writer_share"], "optional": ["advance_amount", "territories"]}',
    true),

    ('cc3ebc99-9c0b-4ef8-bb6d-6bb9bd380a83', 'Administration Agreement', 'administration',
    'ADMINISTRATION AGREEMENT

This Administration Agreement is entered into as of {{effective_date}}...

[Template content for administration deals...]',
    '{"required": ["effective_date", "songwriter_name", "admin_fee_percentage"], "optional": ["territories", "term_months"]}',
    true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROYALTY STATEMENTS (Sample)
-- ============================================
INSERT INTO royalty_statements (id, period_id, songwriter_id, gross_royalties, publisher_share, writer_share, advance_recoupment, net_payable, status) VALUES
    ('dd1ebc99-9c0b-4ef8-bb6d-6bb9bd380a91', 'aa3ebc99-9c0b-4ef8-bb6d-6bb9bd380a63', '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 8100.00, 4050.00, 4050.00, 1000.00, 3050.00, 'calculated'),
    ('dd2ebc99-9c0b-4ef8-bb6d-6bb9bd380a92', 'aa3ebc99-9c0b-4ef8-bb6d-6bb9bd380a63', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 7200.00, 2880.00, 4320.00, 1500.00, 2820.00, 'calculated'),
    ('dd3ebc99-9c0b-4ef8-bb6d-6bb9bd380a93', 'aa3ebc99-9c0b-4ef8-bb6d-6bb9bd380a63', '30eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 2400.00, 360.00, 2040.00, 0.00, 2040.00, 'calculated'),
    ('dd4ebc99-9c0b-4ef8-bb6d-6bb9bd380a94', 'aa3ebc99-9c0b-4ef8-bb6d-6bb9bd380a63', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a24', 2000.00, 1000.00, 1000.00, 1000.00, 0.00, 'calculated')
ON CONFLICT (period_id, songwriter_id) DO NOTHING;

-- Done!
SELECT 'Seed data loaded successfully!' as status;
