-- MVR 数据库表创建脚本
-- 基于 document-verification 的 MvrData 接口设计

-- 1. MVR 主记录表
CREATE TABLE IF NOT EXISTS mvr_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- 关联 Clerk 用户ID
    
    -- 基础个人信息 (BaseDocumentData)
    name TEXT,
    licence_number TEXT,
    date_of_birth DATE,
    address TEXT,
    
    -- MVR 特有信息
    gender TEXT,
    issue_date DATE,
    expiry_date DATE,
    class TEXT, -- 驾照类别
    status TEXT, -- 驾照状态
    
    -- 文件信息
    file_name TEXT,
    file_id TEXT,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 索引字段
    CONSTRAINT mvr_records_user_id_idx UNIQUE (user_id, file_id)
);

-- 2. MVR 违规条件表
CREATE TABLE IF NOT EXISTS mvr_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mvr_record_id UUID NOT NULL REFERENCES mvr_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- 冗余但便于查询
    
    -- 违规条件信息
    condition_date DATE,
    description TEXT NOT NULL,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. MVR 定罪记录表
CREATE TABLE IF NOT EXISTS mvr_convictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mvr_record_id UUID NOT NULL REFERENCES mvr_records(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- 冗余但便于查询
    
    -- 定罪记录信息
    conviction_date DATE,
    description TEXT NOT NULL,
    
    -- 系统字段
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_mvr_records_user_id ON mvr_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mvr_records_licence_number ON mvr_records(licence_number);
CREATE INDEX IF NOT EXISTS idx_mvr_conditions_mvr_record_id ON mvr_conditions(mvr_record_id);
CREATE INDEX IF NOT EXISTS idx_mvr_conditions_user_id ON mvr_conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_mvr_convictions_mvr_record_id ON mvr_convictions(mvr_record_id);
CREATE INDEX IF NOT EXISTS idx_mvr_convictions_user_id ON mvr_convictions(user_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用触发器到所有表
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

-- 暂时禁用 RLS 以简化测试
ALTER TABLE mvr_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE mvr_conditions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mvr_convictions DISABLE ROW LEVEL SECURITY;

-- 验证表创建
SELECT 
    table_name,
    table_schema 
FROM information_schema.tables 
WHERE table_name IN ('mvr_records', 'mvr_conditions', 'mvr_convictions')
ORDER BY table_name; 