-- ============================================================================
-- 添加 field_type 到 signature_positions 表
-- 用于标识不同类型的签名字段（签名、文本、日期等）
-- ============================================================================

-- 1. 添加 field_type 列
ALTER TABLE signature_positions 
ADD COLUMN IF NOT EXISTS field_type TEXT 
CHECK (field_type IN ('signature', 'text', 'date', 'name', 'email', 'number', 'checkbox')) 
DEFAULT 'signature';

-- 2. 添加 default_value 列（用于存储字段的默认值）
ALTER TABLE signature_positions 
ADD COLUMN IF NOT EXISTS default_value TEXT;

-- 3. 添加 field_meta 列（用于存储字段的额外配置信息）
ALTER TABLE signature_positions 
ADD COLUMN IF NOT EXISTS field_meta JSONB DEFAULT '{}';

-- 4. 更新现有数据，将所有现有记录设为 'signature' 类型
UPDATE signature_positions 
SET field_type = 'signature' 
WHERE field_type IS NULL;

-- 5. 为新列添加索引
CREATE INDEX IF NOT EXISTS idx_signature_positions_field_type 
ON signature_positions(field_type);

-- 6. 添加注释
COMMENT ON COLUMN signature_positions.field_type IS '字段类型：signature(签名)、text(文本)、date(日期)、name(姓名)、email(邮箱)、number(数字)、checkbox(复选框)';
COMMENT ON COLUMN signature_positions.default_value IS '字段的默认值，如姓名、邮箱等';
COMMENT ON COLUMN signature_positions.field_meta IS '字段的额外配置信息，如字体、颜色等';

-- ============================================================================
-- 测试查询
-- ============================================================================
-- 查看更新后的表结构
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'signature_positions' 
-- ORDER BY ordinal_position;