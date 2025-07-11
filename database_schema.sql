-- ===============================================
-- 统一文档提取数据库表结构设计
-- 支持 MVR, Auto+, Quote, Application 四种文档类型
-- ===============================================

-- 1. 主文档记录表 - 存储文档的基本信息
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('mvr', 'autoplus', 'quote', 'application')),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(50),
    detected_type VARCHAR(20),
    model_used VARCHAR(100),
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    is_multi_file BOOLEAN DEFAULT FALSE,
    parent_document_id UUID REFERENCES documents(id), -- 用于多文件关联
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_documents_user_id (user_id),
    INDEX idx_documents_type (document_type),
    INDEX idx_documents_status (processing_status),
    INDEX idx_documents_created (created_at),
    INDEX idx_documents_parent (parent_document_id)
);

-- 2. 人员信息表 - 存储所有文档中的人员基本信息
CREATE TABLE persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- 基本信息 (所有文档类型共有)
    name VARCHAR(255),
    licence_number VARCHAR(20),
    date_of_birth DATE,
    address TEXT,
    
    -- MVR/Quote 特有字段
    gender VARCHAR(10),
    marital_status VARCHAR(20),
    relationship_to_applicant VARCHAR(50),
    
    -- 驾照信息
    licence_province VARCHAR(5),
    licence_class VARCHAR(10),
    licence_issue_date DATE,
    licence_expiry_date DATE,
    licence_status VARCHAR(20),
    
    -- 驾照进阶日期 (Quote/Application)
    date_g1 DATE,
    date_g2 DATE,
    date_g DATE,
    first_licensed_date DATE,
    
    -- 保险历史 (Quote/Auto+)
    first_insurance_date DATE,
    date_insured DATE,
    current_carrier VARCHAR(255),
    date_with_company DATE,
    
    -- 职业信息 (Quote)
    occupation VARCHAR(255),
    
    -- 联系信息 (Application)
    phone VARCHAR(20),
    
    -- 文件识别 (多文件支持)
    file_name VARCHAR(255),
    file_id VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_persons_document (document_id),
    INDEX idx_persons_licence (licence_number),
    INDEX idx_persons_name (name),
    INDEX idx_persons_birth (date_of_birth)
);

-- 3. 车辆信息表 - 存储Quote和Application中的车辆信息
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- 基本车辆信息
    vehicle_id VARCHAR(20), -- Auto 1, Auto 2, etc.
    vin VARCHAR(17),
    vehicle_year VARCHAR(4),
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(200),
    vehicle_type VARCHAR(50),
    
    -- 使用信息
    garaging_location VARCHAR(255),
    annual_km VARCHAR(20),
    business_km VARCHAR(20),
    daily_km VARCHAR(20),
    annual_mileage VARCHAR(20), -- Application别名
    commute_distance VARCHAR(20), -- Application别名
    
    -- 拥有权信息
    leased BOOLEAN,
    vehicle_ownership VARCHAR(20), -- lease/owned (Application)
    lienholder_info TEXT, -- Application
    
    -- 购买信息 (Quote)
    purchase_condition VARCHAR(20),
    purchase_date DATE,
    km_at_purchase VARCHAR(20),
    list_price_new VARCHAR(20),
    purchase_price VARCHAR(20),
    
    -- 附加设备
    winter_tires BOOLEAN,
    parking_at_night VARCHAR(100),
    
    -- 防盗设备 (Quote)
    anti_theft_device_type VARCHAR(100),
    anti_theft_manufacturer VARCHAR(100),
    anti_theft_engraving VARCHAR(100),
    
    -- Application特有
    automobile_use_details TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_vehicles_document (document_id),
    INDEX idx_vehicles_vin (vin),
    INDEX idx_vehicles_year_make (vehicle_year, vehicle_make)
);

-- 4. 驾驶员车辆关系表 - 存储Quote中驾驶员与车辆的关系
CREATE TABLE driver_vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    role VARCHAR(10) CHECK (role IN ('prn', 'occ')), -- principal/occasional
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 唯一约束
    UNIQUE(person_id, vehicle_id),
    
    -- 索引
    INDEX idx_driver_assignments_document (document_id),
    INDEX idx_driver_assignments_person (person_id),
    INDEX idx_driver_assignments_vehicle (vehicle_id)
);

-- 5. 保险保障信息表 - 存储Quote和Application的保险保障详情
CREATE TABLE insurance_coverages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE, -- 可选，某些保障可能不绑定特定车辆
    
    -- 保障类型
    coverage_type VARCHAR(50) NOT NULL, -- liability_bodily_injury, comprehensive, collision, etc.
    coverage_category VARCHAR(30), -- liability, loss_or_damage, accident_benefits, etc.
    
    -- 保障详情
    covered BOOLEAN DEFAULT FALSE,
    amount VARCHAR(20), -- 保额
    deductible VARCHAR(20), -- 垫底费
    premium VARCHAR(20), -- 保费 (Application)
    coverage_description TEXT,
    
    -- 特殊字段
    type_detail VARCHAR(50), -- Standard/Enhanced for accident_benefits
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_coverages_document (document_id),
    INDEX idx_coverages_vehicle (vehicle_id),
    INDEX idx_coverages_type (coverage_type)
);

-- 6. 理赔记录表 - 存储Auto+和Quote中的理赔信息
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE, -- Quote中关联到具体驾驶员
    
    -- 理赔基本信息
    claim_number VARCHAR(50), -- Auto+: #1, #2, etc.
    description TEXT,
    date_of_loss DATE,
    at_fault BOOLEAN,
    
    -- 车辆信息
    vehicle_involved VARCHAR(200),
    vehicle_mismatch BOOLEAN DEFAULT FALSE,
    
    -- 赔付金额 (Auto+)
    total_claim_amount VARCHAR(20),
    coverage_types VARCHAR(200), -- AB, DCPD, COLL等
    
    -- 详细赔付 (Quote)
    tp_bi VARCHAR(20), -- Third Party Bodily Injury
    tp_pd VARCHAR(20), -- Third Party Property Damage
    ab VARCHAR(20), -- Accident Benefits
    coll VARCHAR(20), -- Collision
    other_pd VARCHAR(20), -- Other Property Damage
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_claims_document (document_id),
    INDEX idx_claims_person (person_id),
    INDEX idx_claims_date (date_of_loss)
);

-- 7. 违章记录表 - 存储MVR和Quote中的违章信息
CREATE TABLE convictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE, -- Quote中关联到具体驾驶员
    
    description TEXT NOT NULL,
    conviction_date DATE,
    
    -- Quote特有字段
    kmh VARCHAR(10), -- 超速公里数
    severity VARCHAR(20), -- Minor, Major等
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_convictions_document (document_id),
    INDEX idx_convictions_person (person_id),
    INDEX idx_convictions_date (conviction_date)
);

-- 8. 驾照条件表 - 存储MVR中的驾照条件信息
CREATE TABLE licence_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL,
    condition_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_conditions_document (document_id),
    INDEX idx_conditions_person (person_id)
);

-- 9. 保险历史表 - 存储Auto+中的保险政策历史
CREATE TABLE insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    policy_period VARCHAR(100), -- "2017-11-30 to 2020-12-02"
    company VARCHAR(255),
    status VARCHAR(100), -- "Cancelled - non-payment", "Expired"
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_policies_document (document_id),
    INDEX idx_policies_person (person_id)
);

-- 10. 保险中断记录表 - 存储Quote中的保险中断信息
CREATE TABLE insurance_lapses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    description TEXT,
    lapse_date DATE,
    duration_months INTEGER,
    re_instate_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_lapses_document (document_id),
    INDEX idx_lapses_person (person_id)
);

-- 11. 支付信息表 - 存储Application中的支付信息
CREATE TABLE payment_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    annual_premium VARCHAR(20),
    monthly_payment VARCHAR(20),
    payment_type VARCHAR(20) CHECK (payment_type IN ('annual', 'monthly')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_payment_document (document_id)
);

-- 12. 签名信息表 - 存储Application中的签名信息
CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    applicant_signed BOOLEAN,
    applicant_signature_date DATE,
    broker_signed BOOLEAN,
    broker_signature_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_signatures_document (document_id)
);

-- 13. 文档备注表 - 存储Application中的备注信息
CREATE TABLE document_remarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    remarks TEXT,
    lessor_info TEXT, -- Application特有
    driver_limit_notice TEXT, -- Quote特有
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_remarks_document (document_id)
);

-- ===============================================
-- 视图定义 - 便于查询和数据展示
-- ===============================================

-- 完整的MVR数据视图
CREATE VIEW mvr_complete_view AS
SELECT 
    d.id as document_id,
    d.user_id,
    d.file_name,
    d.created_at,
    p.name,
    p.licence_number,
    p.date_of_birth,
    p.address,
    p.gender,
    p.licence_issue_date,
    p.licence_expiry_date,
    p.licence_class,
    p.licence_status,
    
    -- 聚合条件
    COALESCE(
        JSON_AGG(
            DISTINCT jsonb_build_object(
                'date', lc.condition_date,
                'description', lc.description
            )
        ) FILTER (WHERE lc.id IS NOT NULL),
        '[]'::json
    ) as conditions,
    
    -- 聚合违章
    COALESCE(
        JSON_AGG(
            DISTINCT jsonb_build_object(
                'date', c.conviction_date,
                'description', c.description
            )
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
    ) as convictions
    
FROM documents d
LEFT JOIN persons p ON d.id = p.document_id
LEFT JOIN licence_conditions lc ON p.id = lc.person_id
LEFT JOIN convictions c ON p.id = c.person_id
WHERE d.document_type = 'mvr'
GROUP BY d.id, p.id;

-- 完整的Quote数据视图
CREATE VIEW quote_complete_view AS
SELECT 
    d.id as document_id,
    d.user_id,
    d.file_name,
    d.created_at,
    
    -- 聚合车辆信息
    COALESCE(
        JSON_AGG(
            DISTINCT jsonb_build_object(
                'vehicle_id', v.vehicle_id,
                'vin', v.vin,
                'vehicle_year', v.vehicle_year,
                'vehicle_make', v.vehicle_make,
                'vehicle_model', v.vehicle_model,
                'garaging_location', v.garaging_location,
                'leased', v.leased,
                'annual_km', v.annual_km,
                'daily_km', v.daily_km
            )
        ) FILTER (WHERE v.id IS NOT NULL),
        '[]'::json
    ) as vehicles,
    
    -- 聚合驾驶员信息
    COALESCE(
        JSON_AGG(
            DISTINCT jsonb_build_object(
                'name', p.name,
                'licence_number', p.licence_number,
                'date_of_birth', p.date_of_birth,
                'gender', p.gender,
                'marital_status', p.marital_status
            )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'::json
    ) as drivers
    
FROM documents d
LEFT JOIN vehicles v ON d.id = v.document_id
LEFT JOIN persons p ON d.id = p.document_id
WHERE d.document_type = 'quote'
GROUP BY d.id;

-- ===============================================
-- 索引优化
-- ===============================================

-- 复合索引用于常见查询
CREATE INDEX idx_documents_user_type_created ON documents(user_id, document_type, created_at DESC);
CREATE INDEX idx_persons_document_licence ON persons(document_id, licence_number);
CREATE INDEX idx_vehicles_document_vin ON vehicles(document_id, vin);
CREATE INDEX idx_claims_document_date ON claims(document_id, date_of_loss DESC);
CREATE INDEX idx_convictions_document_date ON convictions(document_id, conviction_date DESC);

-- ===============================================
-- 触发器 - 自动更新时间戳
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 数据完整性约束
-- ===============================================

-- 确保多文件记录有正确的父子关系
ALTER TABLE documents ADD CONSTRAINT check_multi_file_parent 
    CHECK (
        (is_multi_file = FALSE AND parent_document_id IS NULL) OR
        (is_multi_file = TRUE AND parent_document_id IS NOT NULL)
    );

-- 确保驾驶员车辆关系的一致性
ALTER TABLE driver_vehicle_assignments ADD CONSTRAINT check_same_document
    CHECK (
        (SELECT document_id FROM persons WHERE id = person_id) = 
        (SELECT document_id FROM vehicles WHERE id = vehicle_id)
    ); 