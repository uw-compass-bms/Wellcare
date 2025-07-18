-- ============================================================================
-- 添加字段类型支持到 signature_positions 表
-- 执行时间：2025-01-18
-- 功能：支持多种字段类型（signature, date, text, name, email, number, checkbox）
-- ============================================================================

-- 1. 创建字段类型枚举（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type') THEN
    CREATE TYPE field_type AS ENUM (
      'signature',
      'date', 
      'text',
      'name',
      'email',
      'number',
      'checkbox'
    );
  END IF;
END$$;

-- 2. 添加新字段到 signature_positions 表
ALTER TABLE signature_positions 
ADD COLUMN IF NOT EXISTS field_type field_type DEFAULT 'signature',
ADD COLUMN IF NOT EXISTS field_meta JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS default_value TEXT;

-- 3. 更新现有记录的字段类型（如果有的话）
UPDATE signature_positions 
SET field_type = 'signature' 
WHERE field_type IS NULL;

-- 4. 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_signature_positions_field_type 
ON signature_positions(field_type);

CREATE INDEX IF NOT EXISTS idx_signature_positions_is_required 
ON signature_positions(is_required);

-- 5. 创建字段元数据验证函数
CREATE OR REPLACE FUNCTION validate_field_meta()
RETURNS TRIGGER AS $$
BEGIN
  -- 根据字段类型验证元数据
  CASE NEW.field_type
    WHEN 'text' THEN
      -- 文本字段默认配置
      IF NOT (NEW.field_meta ? 'maxLength') THEN
        NEW.field_meta = NEW.field_meta || '{"maxLength": 100}'::jsonb;
      END IF;
      -- 验证 maxLength
      IF NEW.field_meta ? 'maxLength' AND (NEW.field_meta->>'maxLength')::int < 0 THEN
        RAISE EXCEPTION 'maxLength must be positive';
      END IF;
      
    WHEN 'number' THEN
      -- 数字字段验证
      IF NEW.field_meta ? 'min' AND NEW.field_meta ? 'max' THEN
        IF (NEW.field_meta->>'min')::numeric > (NEW.field_meta->>'max')::numeric THEN
          RAISE EXCEPTION 'min value cannot be greater than max value';
        END IF;
      END IF;
      
    WHEN 'date' THEN
      -- 日期字段默认配置
      IF NOT (NEW.field_meta ? 'format') THEN
        NEW.field_meta = NEW.field_meta || '{"format": "MM/DD/YYYY"}'::jsonb;
      END IF;
      
    WHEN 'checkbox' THEN
      -- 复选框默认配置
      IF NOT (NEW.field_meta ? 'defaultChecked') THEN
        NEW.field_meta = NEW.field_meta || '{"defaultChecked": false}'::jsonb;
      END IF;
      
    WHEN 'signature' THEN
      -- 签名字段默认配置
      IF NOT (NEW.field_meta ? 'penColor') THEN
        NEW.field_meta = NEW.field_meta || '{"penColor": "blue", "lineWidth": 2}'::jsonb;
      END IF;
      
    ELSE
      NULL; -- 其他类型暂不验证
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建触发器
DROP TRIGGER IF EXISTS validate_field_meta_trigger ON signature_positions;
CREATE TRIGGER validate_field_meta_trigger
  BEFORE INSERT OR UPDATE ON signature_positions
  FOR EACH ROW
  EXECUTE FUNCTION validate_field_meta();

-- 7. 创建字段内容生成函数（支持不同字段类型）
CREATE OR REPLACE FUNCTION generate_field_content(
  p_field_type field_type,
  p_recipient_name TEXT,
  p_field_value TEXT DEFAULT NULL,
  p_sign_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS TEXT AS $$
BEGIN
  CASE p_field_type
    WHEN 'signature' THEN
      RETURN '【' || p_recipient_name || '】signed at【' || 
             to_char(p_sign_time, 'YYYY-MM-DD HH24:MI:SS') || '】';
    WHEN 'date' THEN
      RETURN COALESCE(p_field_value, to_char(p_sign_time, 'YYYY-MM-DD'));
    WHEN 'text', 'name', 'email', 'number' THEN
      RETURN COALESCE(p_field_value, '');
    WHEN 'checkbox' THEN
      RETURN COALESCE(p_field_value, 'false');
    ELSE
      RETURN p_field_value;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 8. 更新签字状态触发器以支持新的字段类型
CREATE OR REPLACE FUNCTION update_signature_status()
RETURNS TRIGGER AS $$
DECLARE
  recipient_name TEXT;
BEGIN
  -- 当位置被签字时，自动生成签字内容
  IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
    -- 获取收件人姓名
    SELECT sr.name INTO recipient_name
    FROM signature_recipients sr
    WHERE sr.id = NEW.recipient_id;
    
    -- 根据字段类型生成内容
    IF NEW.field_type = 'signature' AND NEW.signature_content IS NULL THEN
      NEW.signature_content = generate_field_content(NEW.field_type, recipient_name);
    END IF;
    
    NEW.signed_at = CURRENT_TIMESTAMP;
    
    -- 检查该收件人是否完成了所有必填字段
    IF NOT EXISTS (
      SELECT 1 FROM signature_positions 
      WHERE recipient_id = NEW.recipient_id 
      AND status = 'pending' 
      AND is_required = true
    ) THEN
      -- 更新收件人状态为已签字
      UPDATE signature_recipients 
      SET status = 'signed', signed_at = CURRENT_TIMESTAMP
      WHERE id = NEW.recipient_id;
      
      -- 检查任务是否完成
      IF NOT EXISTS (
        SELECT 1 FROM signature_recipients 
        WHERE task_id = (SELECT task_id FROM signature_recipients WHERE id = NEW.recipient_id) 
        AND status != 'signed'
      ) THEN
        -- 更新任务状态为完成
        UPDATE signature_tasks 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT task_id FROM signature_recipients WHERE id = NEW.recipient_id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 重新创建触发器
DROP TRIGGER IF EXISTS signature_positions_status_trigger ON signature_positions;
CREATE TRIGGER signature_positions_status_trigger
  AFTER UPDATE ON signature_positions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_signature_status();

-- 10. 添加字段说明
COMMENT ON COLUMN signature_positions.field_type IS '字段类型：signature(签名), date(日期), text(文本), name(姓名), email(邮箱), number(数字), checkbox(复选框)';
COMMENT ON COLUMN signature_positions.field_meta IS '字段元数据，JSON格式，存储字段特定配置如验证规则、默认值等';
COMMENT ON COLUMN signature_positions.is_required IS '字段是否必填';
COMMENT ON COLUMN signature_positions.default_value IS '字段默认值';

-- 11. 更新现有数据的默认 field_meta（可选）
UPDATE signature_positions 
SET field_meta = 
  CASE 
    WHEN field_type = 'signature' THEN '{"penColor": "blue", "lineWidth": 2}'::jsonb
    WHEN field_type = 'text' THEN '{"maxLength": 100, "multiline": false}'::jsonb
    WHEN field_type = 'date' THEN '{"format": "MM/DD/YYYY"}'::jsonb
    WHEN field_type = 'email' THEN '{"validation": "email"}'::jsonb
    WHEN field_type = 'number' THEN '{"min": null, "max": null}'::jsonb
    WHEN field_type = 'checkbox' THEN '{"defaultChecked": false}'::jsonb
    ELSE '{}'::jsonb
  END
WHERE field_meta = '{}' OR field_meta IS NULL;

-- 12. 验证迁移成功
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  -- 检查所有新列是否存在
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'signature_positions' 
  AND column_name IN ('field_type', 'field_meta', 'is_required', 'default_value');
  
  IF column_count = 4 THEN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ 字段类型支持已成功添加！';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '新增功能:';
    RAISE NOTICE '  ✓ field_type 枚举类型（7种字段类型）';
    RAISE NOTICE '  ✓ field_meta JSONB字段（存储字段配置）';
    RAISE NOTICE '  ✓ is_required 必填标记';
    RAISE NOTICE '  ✓ default_value 默认值字段';
    RAISE NOTICE '  ✓ 字段元数据验证';
    RAISE NOTICE '  ✓ 支持不同字段类型的内容生成';
    RAISE NOTICE '============================================================================';
  ELSE
    RAISE EXCEPTION '❌ 迁移失败：不是所有列都被成功添加（找到 % 列，期望 4 列）', column_count;
  END IF;
END $$;