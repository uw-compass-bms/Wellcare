# 数据库设置指南 - uw-compass 完整系统

## 概述

本指南将帮助您在 Supabase 中设置完整的 uw-compass 数据库架构，包含所有4种文档类型的表结构：

- **Cases** - 主案例管理系统
- **MVR Records** - 机动车记录
- **Auto+ Records** - 保险历史记录
- **Quote Records** - 保险报价记录
- **Application Records** - 保险申请记录

## 数据库架构

### 主要表结构

1. **Cases系统**
   - `cases` - 主案例表，所有文档的容器
   - 自动生成Case编号格式：`CASE-YYYYMMDD-XXXX`
   - 包含4种文档类型的计数字段

2. **MVR系统** (3张表)
   - `mvr_records` - MVR主记录
   - `mvr_conditions` - 违规条件
   - `mvr_convictions` - 定罪记录

3. **Auto+系统** (3张表)
   - `autoplus_records` - Auto+主记录
   - `autoplus_policies` - 保单历史
   - `autoplus_claims` - 理赔记录

4. **Quote系统** (6张表)
   - `quote_records` - Quote主记录
   - `quote_vehicles` - 车辆信息
   - `quote_drivers` - 驾驶员信息
   - `quote_claims` - 理赔记录
   - `quote_lapses` - 保险间断记录
   - `quote_convictions` - 违法记录

5. **Application系统** (3张表)
   - `application_records` - Application主记录
   - `application_vehicles` - 车辆信息
   - `application_drivers` - 驾驶员信息

**总计：16张表 + 3个核心函数 + 完整的触发器系统**

## 快速设置步骤

### 1. 访问 Supabase SQL 编辑器

1. 登录到您的 Supabase 项目
2. 在左侧导航栏中点击 **SQL Editor**
3. 点击 **New query** 创建新查询

### 2. 执行数据库设置脚本

1. 复制 `complete_database_setup.sql` 文件的全部内容
2. 粘贴到 SQL 编辑器中
3. 点击 **Run** 执行脚本

### 3. 验证安装

脚本执行完成后，您应该看到查询结果表格显示：

| status | count |
|--------|-------|
| Cases created | X |
| MVR records migrated | X |
| ========================================== | |
| 数据库设置完成！ | |
| - 所有表创建成功 | |
| - 所有函数和触发器创建成功 | |
| - 现有MVR数据已迁移到Cases系统 | |
| - 系统已就绪，可以开始使用 | |
| ========================================== | |

### 4. 检查表结构

在 SQL 编辑器中运行以下查询来验证所有表是否创建成功：

```sql
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
```

您应该看到所有16张表都已创建。

## 关键功能

### 1. 自动Case编号生成

- 格式：`CASE-YYYYMMDD-XXXX`
- 示例：`CASE-20241215-0001`
- 每天从0001开始递增

### 2. 文档计数自动更新

每当插入或删除文档记录时，对应的Case记录会自动更新计数：
- `mvr_count` - MVR文档数量
- `autoplus_count` - Auto+文档数量
- `quote_count` - Quote文档数量
- `application_count` - Application文档数量

### 3. 数据迁移

脚本会自动将现有的MVR数据迁移到新的Cases系统：
- 为每个不同的用户+姓名+驾照号组合创建一个Case
- 将相关的MVR记录链接到新创建的Case
- 保持数据完整性

### 4. 完整的关系映射

所有表都通过外键正确关联：
- 所有文档记录都关联到Cases
- 子表（如conditions、claims）都关联到主记录
- 支持级联删除

## 数据访问模式

### 基本查询示例

```sql
-- 获取用户的所有Cases
SELECT * FROM cases WHERE user_id = 'user_xxx' ORDER BY created_at DESC;

-- 获取特定Case的所有MVR记录
SELECT * FROM mvr_records WHERE case_id = 'case_uuid_here';

-- 获取Case的文档统计
SELECT 
    case_number,
    mvr_count,
    autoplus_count,
    quote_count,
    application_count,
    (mvr_count + autoplus_count + quote_count + application_count) as total_documents
FROM cases 
WHERE user_id = 'user_xxx';
```

### 搜索功能

支持多种搜索模式：
- 按Case编号搜索
- 按主要联系人姓名搜索
- 按驾照号搜索
- 按日期范围搜索

## 故障排除

### 常见错误及解决方案

1. **"relation does not exist" 错误**
   - 确保完整执行了 `complete_database_setup.sql` 脚本
   - 检查是否有语法错误导致脚本中断

2. **权限错误**
   - 确保您有足够的权限执行DDL语句
   - 脚本已禁用RLS以简化开发

3. **触发器错误**
   - 检查函数是否正确创建
   - 验证触发器是否已正确绑定

### 重新安装

如果需要重新安装：

1. 删除所有相关表：
```sql
DROP TABLE IF EXISTS application_drivers CASCADE;
DROP TABLE IF EXISTS application_vehicles CASCADE;
DROP TABLE IF EXISTS application_records CASCADE;
DROP TABLE IF EXISTS quote_convictions CASCADE;
DROP TABLE IF EXISTS quote_lapses CASCADE;
DROP TABLE IF EXISTS quote_claims CASCADE;
DROP TABLE IF EXISTS quote_drivers CASCADE;
DROP TABLE IF EXISTS quote_vehicles CASCADE;
DROP TABLE IF EXISTS quote_records CASCADE;
DROP TABLE IF EXISTS autoplus_claims CASCADE;
DROP TABLE IF EXISTS autoplus_policies CASCADE;
DROP TABLE IF EXISTS autoplus_records CASCADE;
DROP TABLE IF EXISTS mvr_convictions CASCADE;
DROP TABLE IF EXISTS mvr_conditions CASCADE;
DROP TABLE IF EXISTS mvr_records CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
```

2. 重新执行 `complete_database_setup.sql` 脚本

## 支持的文档类型

### 1. MVR (Motor Vehicle Record)
- 个人信息、驾照信息
- 违规条件、定罪记录
- 支持多文件上传

### 2. Auto+ (Insurance History)
- 保险历史、保单信息
- 理赔记录
- 支持多文件上传

### 3. Quote (Insurance Quote)
- 多车辆、多驾驶员支持
- 详细的保险保障信息
- 理赔、违法、间断记录
- 单文件上传

### 4. Application (Insurance Application)
- 保险申请表(OAF-1)
- 多车辆、多驾驶员支持
- 详细的保险保障配置
- 单文件上传

## 下一步

数据库设置完成后：

1. 确保前端应用可以正常连接
2. 测试文档提取和保存功能
3. 验证Cases系统的搜索和筛选功能
4. 检查所有文档类型的数据完整性

如果遇到任何问题，请检查Supabase的日志或联系技术支持。 