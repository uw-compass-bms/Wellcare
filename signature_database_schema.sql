-- ============================================================================
-- 电子签字系统数据库架构 - 精简版
-- 适用于: Supabase PostgreSQL 15+
-- 
-- 设计原则:
-- 1. 简单签名流程 + 商业实用功能
-- 2. 公开页面 + Token 访问方案
-- 3. 禁用RLS，采用应用层权限控制
-- 4. 支持多文件多收件人签字
-- 5. 一键签字功能
-- 6. 精简架构，提高开发效率
-- ============================================================================

-- ============================================================================
-- 1. 签字任务表 (signature_tasks)
-- 核心表：存储每个签字任务的基本信息
-- ============================================================================

CREATE TABLE signature_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                             -- Clerk用户ID
  title TEXT NOT NULL,                                -- 任务标题
  description TEXT,                                   -- 任务描述
  status TEXT CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,                  -- 邮件发送时间
  completed_at TIMESTAMP WITH TIME ZONE,             -- 完成时间
  
  -- 基本约束
  CONSTRAINT signature_tasks_title_length_check CHECK (LENGTH(title) > 0 AND LENGTH(title) <= 200)
);

-- ============================================================================
-- 2. 签字文件表 (signature_files)
-- 存储每个任务包含的PDF文件信息
-- ============================================================================

CREATE TABLE signature_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES signature_tasks(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,                   -- 原始文件名
  display_name TEXT NOT NULL,                        -- 显示名称
  file_size BIGINT NOT NULL,                         -- 文件大小（字节）
  original_file_url TEXT NOT NULL,                   -- 原始文件URL
  final_file_url TEXT,                               -- 签字完成后的文件URL
  file_order INTEGER NOT NULL,                       -- 文件顺序
  status TEXT CHECK (status IN ('uploaded', 'signing', 'completed')) DEFAULT 'uploaded',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 基本约束
  CONSTRAINT signature_files_file_size_check CHECK (file_size > 0),
  CONSTRAINT signature_files_file_order_check CHECK (file_order > 0),
  CONSTRAINT signature_files_task_order_unique UNIQUE(task_id, file_order)
);

-- ============================================================================
-- 3. 签字收件人表 (signature_recipients)
-- 存储每个任务的收件人信息和签字状态
-- ============================================================================

CREATE TABLE signature_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES signature_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                                -- 收件人姓名
  email TEXT NOT NULL,                               -- 收件人邮箱
  token TEXT UNIQUE NOT NULL,                        -- 公开页面访问token
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,     -- token过期时间
  status TEXT CHECK (status IN ('pending', 'viewed', 'signed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP WITH TIME ZONE,               -- 首次查看时间
  signed_at TIMESTAMP WITH TIME ZONE,               -- 签字完成时间
  
  -- 基本约束
  CONSTRAINT signature_recipients_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT signature_recipients_name_length_check CHECK (LENGTH(name) > 0 AND LENGTH(name) <= 100),
  CONSTRAINT signature_recipients_task_email_unique UNIQUE(task_id, email),
  CONSTRAINT signature_recipients_expires_check CHECK (expires_at > created_at)
);

-- ============================================================================
-- 4. 签字位置表 (signature_positions)
-- 存储每个收件人在每个文件上的签字位置
-- 采用混合坐标系统：前端百分比 + 后端像素
-- ============================================================================

CREATE TABLE signature_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES signature_recipients(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES signature_files(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,                      -- 页码（从1开始）
  
  -- 前端坐标系统（百分比，用于响应式展示）
  x_percent FLOAT NOT NULL,                          -- X坐标百分比(0-100)
  y_percent FLOAT NOT NULL,                          -- Y坐标百分比(0-100)
  width_percent FLOAT NOT NULL,                      -- 宽度百分比(0-100)
  height_percent FLOAT NOT NULL,                     -- 高度百分比(0-100)
  
  -- 后端坐标系统（像素，用于PDF精确渲染）
  x_pixel INTEGER,                                   -- X坐标像素值
  y_pixel INTEGER,                                   -- Y坐标像素值
  width_pixel INTEGER,                               -- 宽度像素值
  height_pixel INTEGER,                              -- 高度像素值
  
  -- 页面尺寸信息（用于前后端坐标转换）
  page_width INTEGER NOT NULL DEFAULT 595,          -- PDF页面宽度(pt)
  page_height INTEGER NOT NULL DEFAULT 842,         -- PDF页面高度(pt)
  
  -- 签字相关信息
  placeholder_text TEXT DEFAULT 'Click to sign',          -- 占位符文本
  status TEXT CHECK (status IN ('pending', 'signed')) DEFAULT 'pending',
  signature_content TEXT,                            -- 签字后的内容
  signed_at TIMESTAMP WITH TIME ZONE,               -- 签字时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 约束检查
  CONSTRAINT signature_positions_page_check CHECK (page_number > 0),
  CONSTRAINT signature_positions_percent_check CHECK (
    x_percent >= 0 AND x_percent <= 100 AND
    y_percent >= 0 AND y_percent <= 100 AND
    width_percent > 0 AND width_percent <= 100 AND
    height_percent > 0 AND height_percent <= 100
  ),
  CONSTRAINT signature_positions_pixel_check CHECK (
    (x_pixel IS NULL AND y_pixel IS NULL AND width_pixel IS NULL AND height_pixel IS NULL) OR
    (x_pixel >= 0 AND y_pixel >= 0 AND width_pixel > 0 AND height_pixel > 0)
  ),
  CONSTRAINT signature_positions_page_size_check CHECK (
    page_width > 0 AND page_height > 0
  )
);

-- ============================================================================
-- 坐标转换函数
-- 提供前端百分比和后端像素的相互转换
-- ============================================================================

-- 百分比转像素
CREATE OR REPLACE FUNCTION convert_percent_to_pixel(
  percent_value FLOAT,
  page_dimension INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  RETURN ROUND((percent_value / 100.0) * page_dimension);
END;
$$ LANGUAGE plpgsql;

-- 像素转百分比
CREATE OR REPLACE FUNCTION convert_pixel_to_percent(
  pixel_value INTEGER,
  page_dimension INTEGER
)
RETURNS FLOAT AS $$
BEGIN
  IF page_dimension = 0 THEN
    RETURN 0;
  END IF;
  RETURN ROUND((pixel_value::FLOAT / page_dimension::FLOAT) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- 自动计算像素坐标的触发器
CREATE OR REPLACE FUNCTION auto_calculate_pixel_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果像素坐标为空，则自动计算
  IF NEW.x_pixel IS NULL THEN
    NEW.x_pixel = convert_percent_to_pixel(NEW.x_percent, NEW.page_width);
  END IF;
  
  IF NEW.y_pixel IS NULL THEN
    NEW.y_pixel = convert_percent_to_pixel(NEW.y_percent, NEW.page_height);
  END IF;
  
  IF NEW.width_pixel IS NULL THEN
    NEW.width_pixel = convert_percent_to_pixel(NEW.width_percent, NEW.page_width);
  END IF;
  
  IF NEW.height_pixel IS NULL THEN
    NEW.height_pixel = convert_percent_to_pixel(NEW.height_percent, NEW.page_height);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_positions_calculate_pixels_trigger
  BEFORE INSERT OR UPDATE ON signature_positions
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_pixel_coordinates();

-- ============================================================================
-- 优化Token长度 - 缩短至32字符
-- ============================================================================

-- 优化后的 Token 生成函数
CREATE OR REPLACE FUNCTION generate_recipient_token()
RETURNS TEXT AS $$
DECLARE
  timestamp_short TEXT;
  random_part TEXT;
BEGIN
  -- 使用更短的时间戳（相对于2024年的秒数）
  timestamp_short = (extract(epoch from now()) - 1704067200)::bigint::text;
  
  -- 使用8字节随机数，16位hex
  random_part = encode(gen_random_bytes(8), 'hex');
  
  -- 格式: s_<16位随机>_<短时间戳> 总长度约32字符
  RETURN 's_' || random_part || '_' || timestamp_short;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 优化签字内容格式 - 统一自动生成
-- ============================================================================

-- 签字内容自动生成函数
CREATE OR REPLACE FUNCTION generate_signature_content(
  recipient_name TEXT,
  sign_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS TEXT AS $$
BEGIN
  RETURN '【' || recipient_name || '】signed at【' || 
         to_char(sign_time, 'YYYY-MM-DD HH24:MI:SS') || '】';
END;
$$ LANGUAGE plpgsql;

-- 修改签字状态更新触发器，自动生成内容
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
    
    -- 自动生成签字内容和时间
    NEW.signature_content = generate_signature_content(recipient_name);
    NEW.signed_at = CURRENT_TIMESTAMP;
    
    -- 检查该收件人是否完成了所有签字
    IF NOT EXISTS (
      SELECT 1 FROM signature_positions 
      WHERE recipient_id = NEW.recipient_id AND status = 'pending'
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

-- ============================================================================
-- 5. 基础索引
-- 只保留必要的索引，提高查询效率
-- ============================================================================

-- 任务表索引
CREATE INDEX idx_signature_tasks_user_id ON signature_tasks(user_id);
CREATE INDEX idx_signature_tasks_status ON signature_tasks(status);
CREATE INDEX idx_signature_tasks_created_at ON signature_tasks(created_at DESC);

-- 文件表索引
CREATE INDEX idx_signature_files_task_id ON signature_files(task_id);
CREATE INDEX idx_signature_files_task_order ON signature_files(task_id, file_order);

-- 收件人表索引
CREATE INDEX idx_signature_recipients_task_id ON signature_recipients(task_id);
CREATE INDEX idx_signature_recipients_token ON signature_recipients(token);
CREATE INDEX idx_signature_recipients_expires_at ON signature_recipients(expires_at);

-- 位置表索引
CREATE INDEX idx_signature_positions_recipient_id ON signature_positions(recipient_id);
CREATE INDEX idx_signature_positions_file_id ON signature_positions(file_id);

-- ============================================================================
-- 6. 简化触发器
-- 只保留核心的自动更新功能
-- ============================================================================

-- 自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_signature_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_tasks_updated_at_trigger
  BEFORE UPDATE ON signature_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_updated_at();

-- 简化的状态更新触发器
CREATE OR REPLACE FUNCTION update_signature_status()
RETURNS TRIGGER AS $$
BEGIN
  -- 当位置被签字时，更新收件人状态
  IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
    -- 检查该收件人是否完成了所有签字
    IF NOT EXISTS (
      SELECT 1 FROM signature_positions 
      WHERE recipient_id = NEW.recipient_id AND status = 'pending'
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

CREATE TRIGGER signature_positions_status_trigger
  AFTER UPDATE ON signature_positions
  FOR EACH ROW
  WHEN (OLD.status != NEW.status)
  EXECUTE FUNCTION update_signature_status();

-- ============================================================================
-- 7. 权限控制设置
-- 禁用RLS，采用应用层权限控制
-- ============================================================================

-- 禁用RLS
ALTER TABLE signature_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE signature_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE signature_recipients DISABLE ROW LEVEL SECURITY;
ALTER TABLE signature_positions DISABLE ROW LEVEL SECURITY;

-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON signature_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON signature_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON signature_recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON signature_positions TO authenticated;

-- 公开页面权限
GRANT SELECT ON signature_recipients TO anon;
GRANT SELECT ON signature_positions TO anon;
GRANT SELECT ON signature_files TO anon;
GRANT SELECT ON signature_tasks TO anon;
GRANT UPDATE ON signature_positions TO anon;
GRANT UPDATE ON signature_recipients TO anon;

-- ============================================================================
-- 8. 核心辅助函数
-- 只保留必要的业务逻辑函数
-- ============================================================================

-- 验证Token
CREATE OR REPLACE FUNCTION verify_recipient_token(token_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM signature_recipients
    WHERE token = token_input AND expires_at > CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql;

-- 清理过期Token
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM signature_recipients
  WHERE expires_at < CURRENT_TIMESTAMP AND status = 'pending';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. 完成设置
-- ============================================================================

-- 完成日志
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Electronic Signature System - 精简版 创建成功！';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '核心功能:';
  RAISE NOTICE '  ✓ 四张核心表 (任务、文件、收件人、位置)';
  RAISE NOTICE '  ✓ Token公开页面访问';
  RAISE NOTICE '  ✓ 一键签字功能';
  RAISE NOTICE '  ✓ 自动状态更新';
  RAISE NOTICE '  ✓ 精简架构，易于开发';
  RAISE NOTICE '';
  RAISE NOTICE '已删除复杂功能:';
  RAISE NOTICE '  ✗ 文件哈希验证';
  RAISE NOTICE '  ✗ 进度百分比追踪';
  RAISE NOTICE '  ✗ 复杂触发器逻辑';
  RAISE NOTICE '  ✗ 法律合规性检查';
  RAISE NOTICE '';
  RAISE NOTICE '准备开始开发！';
  RAISE NOTICE '============================================================================';
END
$$; 