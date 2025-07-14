-- ========================================
-- 完整数据库设置脚本 - uw-compass系统
-- 包含所有4种文档类型的表结构
-- ========================================

-- 先删除所有可能存在的函数，避免冲突
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_case_number() CASCADE;
DROP FUNCTION IF EXISTS update_case_document_count() CASCADE;

-- 通用函数和触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 生成Case编号的函数
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
    case_date TEXT;
    case_sequence INTEGER;
    new_case_number TEXT;
BEGIN
    -- 获取当前日期的格式 YYYYMMDD
    case_date := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- 获取当天的序列号
    SELECT COALESCE(MAX(CAST(SUBSTRING(c.case_number FROM 'CASE-' || case_date || '-(\d+)') AS INTEGER)), 0) + 1
    INTO case_sequence
    FROM cases c
    WHERE c.case_number LIKE 'CASE-' || case_date || '-%';
    
    -- 生成完整的Case编号
    new_case_number := 'CASE-' || case_date || '-' || LPAD(case_sequence::TEXT, 4, '0');
    
    RETURN new_case_number;
END;
$$ LANGUAGE plpgsql;

-- 更新Case文档计数的函数
CREATE OR REPLACE FUNCTION update_case_document_count()
RETURNS TRIGGER AS $$
DECLARE
    case_id_val UUID;
    doc_type TEXT;
    count_change INTEGER;
BEGIN
    -- 确定操作类型和文档类型
    IF TG_OP = 'INSERT' THEN
        case_id_val := NEW.case_id;
        count_change := 1;
    ELSIF TG_OP = 'DELETE' THEN
        case_id_val := OLD.case_id;
        count_change := -1;
    ELSE
        RETURN NULL;
    END IF;

    -- 确定文档类型
    CASE TG_TABLE_NAME
        WHEN 'mvr_records' THEN doc_type := 'mvr';
        WHEN 'autoplus_records' THEN doc_type := 'autoplus';
        WHEN 'quote_records' THEN doc_type := 'quote';
        WHEN 'application_records' THEN doc_type := 'application';
        ELSE RETURN NULL;
    END CASE;

    -- 更新对应的计数字段
    CASE doc_type
        WHEN 'mvr' THEN
            UPDATE cases SET mvr_count = mvr_count + count_change WHERE id = case_id_val;
        WHEN 'autoplus' THEN
            UPDATE cases SET autoplus_count = autoplus_count + count_change WHERE id = case_id_val;
        WHEN 'quote' THEN
            UPDATE cases SET quote_count = quote_count + count_change WHERE id = case_id_val;
        WHEN 'application' THEN
            UPDATE cases SET application_count = application_count + count_change WHERE id = case_id_val;
    END CASE;

    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 1. CASES 主表
-- ========================================

CREATE TABLE IF NOT EXISTS cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    primary_contact_name TEXT,
    primary_licence_number TEXT,
    status TEXT DEFAULT 'active',
    
    -- 文档计数字段
    mvr_count INTEGER DEFAULT 0,
    autoplus_count INTEGER DEFAULT 0,
    quote_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Cases表索引
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_primary_contact_name ON cases(primary_contact_name);
CREATE INDEX IF NOT EXISTS idx_cases_primary_licence_number ON cases(primary_licence_number);

-- Cases表触发器
DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. MVR 相关表
-- ========================================

-- MVR主记录表
CREATE TABLE IF NOT EXISTS mvr_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- 基础个人信息
    name TEXT,
    licence_number TEXT,
    date_of_birth DATE,
    address TEXT,
    
    -- MVR特有信息
    gender TEXT,
    issue_date DATE,
    expiry_date DATE,
    class TEXT,
    status TEXT,
    
    -- 文件信息
    file_name TEXT,
    file_id TEXT,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MVR违规条件表
CREATE TABLE IF NOT EXISTS mvr_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mvr_record_id UUID NOT NULL REFERENCES mvr_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    condition_date DATE,
    description TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MVR定罪记录表
CREATE TABLE IF NOT EXISTS mvr_convictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mvr_record_id UUID NOT NULL REFERENCES mvr_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    conviction_date DATE,
    description TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MVR表索引
CREATE INDEX IF NOT EXISTS idx_mvr_records_case_id ON mvr_records(case_id);
CREATE INDEX IF NOT EXISTS idx_mvr_records_user_id ON mvr_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mvr_records_licence_number ON mvr_records(licence_number);
CREATE INDEX IF NOT EXISTS idx_mvr_conditions_mvr_record_id ON mvr_conditions(mvr_record_id);
CREATE INDEX IF NOT EXISTS idx_mvr_convictions_mvr_record_id ON mvr_convictions(mvr_record_id);

-- MVR表触发器
DROP TRIGGER IF EXISTS update_mvr_records_updated_at ON mvr_records;
CREATE TRIGGER update_mvr_records_updated_at
    BEFORE UPDATE ON mvr_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mvr_conditions_updated_at ON mvr_conditions;
CREATE TRIGGER update_mvr_conditions_updated_at
    BEFORE UPDATE ON mvr_conditions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mvr_convictions_updated_at ON mvr_convictions;
CREATE TRIGGER update_mvr_convictions_updated_at
    BEFORE UPDATE ON mvr_convictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- MVR Case计数触发器
DROP TRIGGER IF EXISTS mvr_case_count_trigger ON mvr_records;
CREATE TRIGGER mvr_case_count_trigger
    AFTER INSERT OR DELETE ON mvr_records
    FOR EACH ROW
    EXECUTE FUNCTION update_case_document_count();

-- ========================================
-- 3. AUTO+ 相关表
-- ========================================

-- AutoPlus主记录表
CREATE TABLE IF NOT EXISTS autoplus_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- 基础个人信息
    name TEXT,
    licence_number TEXT,
    date_of_birth DATE,
    address TEXT,
    
    -- AutoPlus特有信息
    first_insurance_date DATE,
    
    -- 文件信息
    file_name TEXT,
    file_id TEXT,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AutoPlus保单历史表
CREATE TABLE IF NOT EXISTS autoplus_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    autoplus_record_id UUID NOT NULL REFERENCES autoplus_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    policy_period TEXT,
    company TEXT,
    status TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AutoPlus理赔记录表
CREATE TABLE IF NOT EXISTS autoplus_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    autoplus_record_id UUID NOT NULL REFERENCES autoplus_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    claim_number TEXT,
    date_of_loss DATE,
    at_fault BOOLEAN,
    total_claim_amount TEXT,
    coverage_types TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- AutoPlus表索引
CREATE INDEX IF NOT EXISTS idx_autoplus_records_case_id ON autoplus_records(case_id);
CREATE INDEX IF NOT EXISTS idx_autoplus_records_user_id ON autoplus_records(user_id);
CREATE INDEX IF NOT EXISTS idx_autoplus_records_licence_number ON autoplus_records(licence_number);
CREATE INDEX IF NOT EXISTS idx_autoplus_policies_autoplus_record_id ON autoplus_policies(autoplus_record_id);
CREATE INDEX IF NOT EXISTS idx_autoplus_claims_autoplus_record_id ON autoplus_claims(autoplus_record_id);

-- AutoPlus表触发器
DROP TRIGGER IF EXISTS update_autoplus_records_updated_at ON autoplus_records;
CREATE TRIGGER update_autoplus_records_updated_at
    BEFORE UPDATE ON autoplus_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_autoplus_policies_updated_at ON autoplus_policies;
CREATE TRIGGER update_autoplus_policies_updated_at
    BEFORE UPDATE ON autoplus_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_autoplus_claims_updated_at ON autoplus_claims;
CREATE TRIGGER update_autoplus_claims_updated_at
    BEFORE UPDATE ON autoplus_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- AutoPlus Case计数触发器
DROP TRIGGER IF EXISTS autoplus_case_count_trigger ON autoplus_records;
CREATE TRIGGER autoplus_case_count_trigger
    AFTER INSERT OR DELETE ON autoplus_records
    FOR EACH ROW
    EXECUTE FUNCTION update_case_document_count();

-- ========================================
-- 4. QUOTE 相关表
-- ========================================

-- Quote主记录表
CREATE TABLE IF NOT EXISTS quote_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- 基础向后兼容字段
    name TEXT,
    licence_number TEXT,
    date_of_birth DATE,
    address TEXT,
    gender TEXT,
    licence_class TEXT,
    date_g DATE,
    date_g2 DATE,
    date_g1 DATE,
    date_insured DATE,
    date_with_company DATE,
    
    -- 车辆向后兼容字段
    vin TEXT,
    vehicle_year TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    garaging_location TEXT,
    leased BOOLEAN,
    annual_mileage TEXT,
    commute_distance TEXT,
    
    -- 联系信息
    customer_contact_info_address TEXT,
    customer_contact_info_email TEXT,
    customer_contact_info_phone TEXT,
    
    -- 驾驶员限制通知
    driver_limit_notice TEXT,
    
    -- 文件信息
    file_name TEXT,
    file_id TEXT,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Quote车辆表
CREATE TABLE IF NOT EXISTS quote_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_record_id UUID NOT NULL REFERENCES quote_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    vehicle_id TEXT NOT NULL,
    vehicle_type TEXT,
    vin TEXT,
    vehicle_year TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    garaging_location TEXT,
    leased BOOLEAN,
    annual_km TEXT,
    business_km TEXT,
    daily_km TEXT,
    purchase_condition TEXT,
    purchase_date DATE,
    km_at_purchase TEXT,
    list_price_new TEXT,
    purchase_price TEXT,
    winter_tires BOOLEAN,
    parking_at_night TEXT,
    
    -- 防盗设备信息
    anti_theft_device_type TEXT,
    anti_theft_manufacturer TEXT,
    anti_theft_engraving TEXT,
    
    -- 保险保障信息
    bodily_injury_covered BOOLEAN,
    bodily_injury_amount TEXT,
    direct_compensation_covered BOOLEAN,
    direct_compensation_deductible TEXT,
    accident_benefits_covered BOOLEAN,
    accident_benefits_type TEXT,
    uninsured_automobile_covered BOOLEAN,
    loss_or_damage_comprehensive_covered BOOLEAN,
    loss_or_damage_comprehensive_deductible TEXT,
    loss_or_damage_collision_covered BOOLEAN,
    loss_or_damage_collision_deductible TEXT,
    loss_or_damage_all_perils_covered BOOLEAN,
    loss_or_damage_all_perils_deductible TEXT,
    
    -- 附加条款
    endorsements_rent_or_lease BOOLEAN,
    endorsements_loss_of_use_covered BOOLEAN,
    endorsements_loss_of_use_amount TEXT,
    endorsements_liab_to_unowned_veh_covered BOOLEAN,
    endorsements_liab_to_unowned_veh_amount TEXT,
    endorsements_replacement_cost BOOLEAN,
    endorsements_family_protection_covered BOOLEAN,
    endorsements_family_protection_amount TEXT,
    endorsements_accident_waiver BOOLEAN,
    endorsements_minor_conviction_protection BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Quote驾驶员表
CREATE TABLE IF NOT EXISTS quote_drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_record_id UUID NOT NULL REFERENCES quote_records(id) ON DELETE CASCADE,
    quote_vehicle_id UUID REFERENCES quote_vehicles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    name TEXT NOT NULL,
    role TEXT, -- 'prn' or 'occ'
    birth_date DATE,
    marital_status TEXT,
    gender TEXT,
    relationship_to_applicant TEXT,
    licence_number TEXT,
    licence_province TEXT,
    occupation TEXT,
    licence_class TEXT,
    date_g DATE,
    date_g2 DATE,
    date_g1 DATE,
    date_insured DATE,
    current_carrier TEXT,
    date_with_company DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Quote理赔记录表
CREATE TABLE IF NOT EXISTS quote_claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_driver_id UUID NOT NULL REFERENCES quote_drivers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    description TEXT,
    claim_date DATE,
    at_fault BOOLEAN,
    vehicle_involved TEXT,
    tp_bi TEXT,
    tp_pd TEXT,
    ab TEXT,
    coll TEXT,
    other_pd TEXT,
    vehicle_mismatch BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Quote保险间断记录表
CREATE TABLE IF NOT EXISTS quote_lapses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_driver_id UUID NOT NULL REFERENCES quote_drivers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    description TEXT,
    lapse_date DATE,
    duration_months INTEGER,
    re_instate_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Quote违法记录表
CREATE TABLE IF NOT EXISTS quote_convictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_driver_id UUID NOT NULL REFERENCES quote_drivers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    description TEXT,
    conviction_date DATE,
    kmh TEXT,
    severity TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Quote表索引
CREATE INDEX IF NOT EXISTS idx_quote_records_case_id ON quote_records(case_id);
CREATE INDEX IF NOT EXISTS idx_quote_records_user_id ON quote_records(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_records_licence_number ON quote_records(licence_number);
CREATE INDEX IF NOT EXISTS idx_quote_vehicles_quote_record_id ON quote_vehicles(quote_record_id);
CREATE INDEX IF NOT EXISTS idx_quote_drivers_quote_record_id ON quote_drivers(quote_record_id);
CREATE INDEX IF NOT EXISTS idx_quote_drivers_quote_vehicle_id ON quote_drivers(quote_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quote_claims_quote_driver_id ON quote_claims(quote_driver_id);
CREATE INDEX IF NOT EXISTS idx_quote_lapses_quote_driver_id ON quote_lapses(quote_driver_id);
CREATE INDEX IF NOT EXISTS idx_quote_convictions_quote_driver_id ON quote_convictions(quote_driver_id);

-- Quote表触发器
DROP TRIGGER IF EXISTS update_quote_records_updated_at ON quote_records;
CREATE TRIGGER update_quote_records_updated_at
    BEFORE UPDATE ON quote_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_vehicles_updated_at ON quote_vehicles;
CREATE TRIGGER update_quote_vehicles_updated_at
    BEFORE UPDATE ON quote_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_drivers_updated_at ON quote_drivers;
CREATE TRIGGER update_quote_drivers_updated_at
    BEFORE UPDATE ON quote_drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_claims_updated_at ON quote_claims;
CREATE TRIGGER update_quote_claims_updated_at
    BEFORE UPDATE ON quote_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_lapses_updated_at ON quote_lapses;
CREATE TRIGGER update_quote_lapses_updated_at
    BEFORE UPDATE ON quote_lapses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quote_convictions_updated_at ON quote_convictions;
CREATE TRIGGER update_quote_convictions_updated_at
    BEFORE UPDATE ON quote_convictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Quote Case计数触发器
DROP TRIGGER IF EXISTS quote_case_count_trigger ON quote_records;
CREATE TRIGGER quote_case_count_trigger
    AFTER INSERT OR DELETE ON quote_records
    FOR EACH ROW
    EXECUTE FUNCTION update_case_document_count();

-- ========================================
-- 5. APPLICATION 相关表
-- ========================================

-- Application主记录表
CREATE TABLE IF NOT EXISTS application_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- 基础个人信息
    name TEXT,
    licence_number TEXT,
    date_of_birth DATE,
    address TEXT,
    phone TEXT,
    lessor_info TEXT,
    
    -- 保单信息
    effective_date DATE,
    expiry_date DATE,
    
    -- 向后兼容字段
    vehicle_year TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vin TEXT,
    lienholder_info TEXT,
    vehicle_ownership TEXT,
    annual_mileage TEXT,
    commute_distance TEXT,
    automobile_use_details TEXT,
    
    -- 备注信息
    remarks TEXT,
    
    -- 支付信息
    payment_info_annual_premium TEXT,
    payment_info_monthly_payment TEXT,
    payment_info_payment_type TEXT,
    
    -- 签名确认
    signatures_applicant_signed BOOLEAN,
    signatures_applicant_signature_date DATE,
    signatures_broker_signed BOOLEAN,
    signatures_broker_signature_date DATE,
    
    -- 向后兼容的保险保障信息
    insurance_coverages_liability_amount TEXT,
    insurance_coverages_loss_or_damage_comprehensive_covered BOOLEAN,
    insurance_coverages_loss_or_damage_comprehensive_deductible TEXT,
    insurance_coverages_loss_or_damage_collision_covered BOOLEAN,
    insurance_coverages_loss_or_damage_collision_deductible TEXT,
    insurance_coverages_loss_or_damage_all_perils_covered BOOLEAN,
    insurance_coverages_loss_or_damage_all_perils_deductible TEXT,
    insurance_coverages_loss_or_damage_all_perils_premium TEXT,
    
    -- 向后兼容的附加条款
    policy_change_forms_loss_of_use BOOLEAN,
    policy_change_forms_liab_to_unowned_veh BOOLEAN,
    policy_change_forms_limited_waiver BOOLEAN,
    policy_change_forms_rent_or_lease BOOLEAN,
    policy_change_forms_accident_waiver BOOLEAN,
    policy_change_forms_minor_conviction_protection BOOLEAN,
    
    -- 文件信息
    file_name TEXT,
    file_id TEXT,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Application车辆表
CREATE TABLE IF NOT EXISTS application_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_record_id UUID NOT NULL REFERENCES application_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    vehicle_id TEXT NOT NULL,
    vehicle_year TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vin TEXT,
    lienholder_info TEXT,
    vehicle_ownership TEXT,
    annual_mileage TEXT,
    commute_distance TEXT,
    automobile_use_details TEXT,
    
    -- 责任险保障
    liability_bodily_injury_amount TEXT,
    liability_bodily_injury_premium TEXT,
    liability_property_damage_amount TEXT,
    liability_property_damage_premium TEXT,
    
    -- 意外福利
    accident_benefits_standard_amount TEXT,
    accident_benefits_standard_premium TEXT,
    accident_benefits_enhanced_income_replacement BOOLEAN,
    accident_benefits_enhanced_medical_care BOOLEAN,
    accident_benefits_enhanced_catastrophic_impairment BOOLEAN,
    accident_benefits_enhanced_caregiver_maintenance BOOLEAN,
    accident_benefits_enhanced_death_funeral BOOLEAN,
    accident_benefits_enhanced_dependant_care BOOLEAN,
    accident_benefits_enhanced_indexation_benefit BOOLEAN,
    
    -- 未保险汽车
    uninsured_automobile_covered BOOLEAN,
    uninsured_automobile_amount TEXT,
    uninsured_automobile_premium TEXT,
    
    -- 直接赔偿
    direct_compensation_covered BOOLEAN,
    direct_compensation_deductible TEXT,
    direct_compensation_premium TEXT,
    
    -- 车辆损失保障
    loss_or_damage_comprehensive_covered BOOLEAN,
    loss_or_damage_comprehensive_deductible TEXT,
    loss_or_damage_comprehensive_premium TEXT,
    loss_or_damage_collision_covered BOOLEAN,
    loss_or_damage_collision_deductible TEXT,
    loss_or_damage_collision_premium TEXT,
    loss_or_damage_all_perils_covered BOOLEAN,
    loss_or_damage_all_perils_deductible TEXT,
    loss_or_damage_all_perils_premium TEXT,
    loss_or_damage_specified_perils_covered BOOLEAN,
    loss_or_damage_specified_perils_deductible TEXT,
    loss_or_damage_specified_perils_premium TEXT,
    
    -- 附加条款
    policy_change_forms_family_protection_covered BOOLEAN,
    policy_change_forms_family_protection_deductible TEXT,
    policy_change_forms_family_protection_premium TEXT,
    
    -- 每台车的保费合计
    total_premium TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Application驾驶员表
CREATE TABLE IF NOT EXISTS application_drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    application_record_id UUID NOT NULL REFERENCES application_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    name TEXT NOT NULL,
    licence_number TEXT,
    date_of_birth DATE,
    gender TEXT,
    marital_status TEXT,
    first_licensed_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Application表索引
CREATE INDEX IF NOT EXISTS idx_application_records_case_id ON application_records(case_id);
CREATE INDEX IF NOT EXISTS idx_application_records_user_id ON application_records(user_id);
CREATE INDEX IF NOT EXISTS idx_application_records_licence_number ON application_records(licence_number);
CREATE INDEX IF NOT EXISTS idx_application_vehicles_application_record_id ON application_vehicles(application_record_id);
CREATE INDEX IF NOT EXISTS idx_application_drivers_application_record_id ON application_drivers(application_record_id);

-- Application表触发器
DROP TRIGGER IF EXISTS update_application_records_updated_at ON application_records;
CREATE TRIGGER update_application_records_updated_at
    BEFORE UPDATE ON application_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_application_vehicles_updated_at ON application_vehicles;
CREATE TRIGGER update_application_vehicles_updated_at
    BEFORE UPDATE ON application_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_application_drivers_updated_at ON application_drivers;
CREATE TRIGGER update_application_drivers_updated_at
    BEFORE UPDATE ON application_drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Application Case计数触发器
DROP TRIGGER IF EXISTS application_case_count_trigger ON application_records;
CREATE TRIGGER application_case_count_trigger
    AFTER INSERT OR DELETE ON application_records
    FOR EACH ROW
    EXECUTE FUNCTION update_case_document_count();

-- ========================================
-- 6. 数据迁移 - 将现有MVR数据迁移到Cases系统
-- ========================================

DO $$
DECLARE
    rec RECORD;
    new_case_id UUID;
    case_number TEXT;
BEGIN
    -- 检查是否有现有的MVR数据需要迁移
    FOR rec IN 
        SELECT DISTINCT user_id, name, licence_number 
        FROM mvr_records 
        WHERE case_id IS NULL 
        ORDER BY user_id, name, licence_number
    LOOP
        -- 为每个不同的用户+姓名+驾照号创建一个Case
        case_number := generate_case_number();
        
        INSERT INTO cases (case_number, user_id, primary_contact_name, primary_licence_number)
        VALUES (case_number, rec.user_id, rec.name, rec.licence_number)
        RETURNING id INTO new_case_id;
        
        -- 更新相关的MVR记录
        UPDATE mvr_records 
        SET case_id = new_case_id
        WHERE user_id = rec.user_id 
        AND (name = rec.name OR (name IS NULL AND rec.name IS NULL))
        AND (licence_number = rec.licence_number OR (licence_number IS NULL AND rec.licence_number IS NULL))
        AND case_id IS NULL;
    END LOOP;
END $$;

-- ========================================
-- 7. 权限设置
-- ========================================

-- 暂时禁用RLS以简化开发
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE mvr_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE mvr_conditions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mvr_convictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE autoplus_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE autoplus_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE autoplus_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lapses DISABLE ROW LEVEL SECURITY;
ALTER TABLE quote_convictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE application_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE application_vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE application_drivers DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 8. 验证脚本
-- ========================================

-- 检查所有表是否创建成功
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN (
    'cases', 'mvr_records', 'mvr_conditions', 'mvr_convictions',
    'autoplus_records', 'autoplus_policies', 'autoplus_claims',
    'quote_records', 'quote_vehicles', 'quote_drivers', 'quote_claims', 'quote_lapses', 'quote_convictions',
    'application_records', 'application_vehicles', 'application_drivers'
)
ORDER BY tablename;

-- 检查函数是否创建成功
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('generate_case_number', 'update_case_document_count', 'update_updated_at_column')
ORDER BY routine_name;

-- 显示迁移结果和完成状态
SELECT 
    'Cases created' as status,
    COUNT(*) as count
FROM cases
UNION ALL
SELECT 
    'MVR records migrated' as status,
    COUNT(*) as count
FROM mvr_records
WHERE case_id IS NOT NULL
UNION ALL
SELECT 
    '==========================================' as status,
    NULL as count
UNION ALL
SELECT 
    '数据库设置完成！' as status,
    NULL as count
UNION ALL
SELECT 
    '- 所有表创建成功' as status,
    NULL as count
UNION ALL
SELECT 
    '- 所有函数和触发器创建成功' as status,
    NULL as count
UNION ALL
SELECT 
    '- 现有MVR数据已迁移到Cases系统' as status,
    NULL as count
UNION ALL
SELECT 
    '- 系统已就绪，可以开始使用' as status,
    NULL as count
UNION ALL
SELECT 
    '==========================================' as status,
    NULL as count; 