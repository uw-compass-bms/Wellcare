-- MVR 测试数据库结构 - 优化版本
-- 基于提示词输出格式优化的表结构

-- ========================================
-- 1. 基础函数
-- ========================================

-- 更新时间戳函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 生成案例编号函数
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
    today_str TEXT;
    counter INTEGER;
    case_number TEXT;
BEGIN
    -- 获取今天的日期字符串 YYYYMMDD
    today_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- 查找今天已有的最大编号
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(case_number FROM 15 FOR 4) AS INTEGER)), 
        0
    ) INTO counter
    FROM cases 
    WHERE case_number LIKE 'CASE-' || today_str || '-%';
    
    -- 生成新的编号
    counter := counter + 1;
    case_number := 'CASE-' || today_str || '-' || LPAD(counter::TEXT, 4, '0');
    
    RETURN case_number;
END;
$$ LANGUAGE plpgsql;

-- 更新案例文档计数函数
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
        ELSE RETURN NULL;
    END CASE;

    -- 更新MVR计数字段
    IF doc_type = 'mvr' THEN
        UPDATE cases SET mvr_count = mvr_count + count_change WHERE id = case_id_val;
    END IF;

    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. CASES 主表
-- ========================================

CREATE TABLE IF NOT EXISTS cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    primary_contact_name TEXT,
    primary_licence_number TEXT,
    status TEXT DEFAULT 'active',
    
    -- MVR文档计数字段
    mvr_count INTEGER DEFAULT 0,
    
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
-- 3. MVR 相关表 (优化版本)
-- ========================================

-- MVR主记录表
CREATE TABLE IF NOT EXISTS mvr_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    
    -- 基础个人信息 (与提示词输出格式一致)
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

-- MVR违规条件表 (优化版本 - 统一字段命名)
CREATE TABLE IF NOT EXISTS mvr_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mvr_record_id UUID NOT NULL REFERENCES mvr_records(id) ON DELETE CASCADE,
    
    -- 优化: 直接使用 date，与提示词输出格式一致
    date DATE,
    description TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- MVR定罪记录表 (优化版本 - 统一字段命名)
CREATE TABLE IF NOT EXISTS mvr_convictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mvr_record_id UUID NOT NULL REFERENCES mvr_records(id) ON DELETE CASCADE,
    
    -- 优化: 直接使用 date，与提示词输出格式一致
    date DATE,
    description TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ========================================
-- 4. 索引优化
-- ========================================

-- MVR表索引
CREATE INDEX IF NOT EXISTS idx_mvr_records_case_id ON mvr_records(case_id);
CREATE INDEX IF NOT EXISTS idx_mvr_records_user_id ON mvr_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mvr_records_licence_number ON mvr_records(licence_number);
CREATE INDEX IF NOT EXISTS idx_mvr_conditions_mvr_record_id ON mvr_conditions(mvr_record_id);
CREATE INDEX IF NOT EXISTS idx_mvr_convictions_mvr_record_id ON mvr_convictions(mvr_record_id);

-- 优化: 为date字段添加索引，提高查询性能
CREATE INDEX IF NOT EXISTS idx_mvr_conditions_date ON mvr_conditions(date);
CREATE INDEX IF NOT EXISTS idx_mvr_convictions_date ON mvr_convictions(date);

-- ========================================
-- 5. 触发器设置
-- ========================================

-- MVR表更新时间戳触发器
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
-- 6. 验证和测试数据
-- ========================================

-- 验证表结构
SELECT 
    'mvr_records' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'mvr_records'
ORDER BY ordinal_position;

SELECT 
    'mvr_conditions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'mvr_conditions'
ORDER BY ordinal_position;

SELECT 
    'mvr_convictions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'mvr_convictions'
ORDER BY ordinal_position;

-- 完成消息
SELECT 
    '🎉 MVR测试数据库创建完成！' as status,
    '✅ 优化后的表结构已创建' as structure,
    '✅ 字段命名与提示词输出一致' as naming,
    '✅ 移除了冗余字段' as optimization,
    '✅ 添加了性能索引' as performance,
    '✅ 触发器和函数已设置' as triggers,
    '🚀 可以开始测试MVR功能了！' as next_step; 