# 签字任务 Dashboard 分页组件设计方案

## 1. 数据库字段参考（signature_tasks）
- id
- title
- description
- status（draft, in_progress, completed, cancelled/trashed）
- created_at
- updated_at
- sent_at
- completed_at
- recipients（如有，或需通过关联表获取）
- expiry_date（如有）

---

## 2. 各分页内容与显示字段

### 1）Inbox / Processing（processing.tsx）
- **筛选条件**：status = 'in_progress'
- **表格字段**：
  - Transaction name（title，点击可查看详情）
  - Recipients（收件人邮箱，逗号分隔）
  - Created Date（created_at）
  - Last Activity（updated_at 或 sent_at）
  - Status（彩色标签：In Progress）
  - Expiry Date（expiry_date，如有）
  - Actions（如归档、删除等）

### 2）Drafts（drafts.tsx）
- **筛选条件**：status = 'draft'
- **表格字段**：
  - Transaction name
  - Recipients
  - Created Date
  - Last Activity
  - Status（Draft，灰色标签）
  - Actions（编辑、删除）

### 3）Completed（completed.tsx）
- **筛选条件**：status = 'completed'
- **表格字段**：
  - Transaction name
  - Recipients
  - Created Date
  - Completed Date（completed_at）
  - Status（Completed，绿色标签）
  - Actions（查看、归档）

### 4）Trashed（trashed.tsx）
- **筛选条件**：status = 'cancelled' 或 'trashed'
- **表格字段**：
  - Transaction name
  - Recipients
  - Created Date
  - Deleted Date（updated_at 或 deleted_at）
  - Status（Trashed，红色标签）
  - Actions（彻底删除、还原）

---

## 3. 交互说明
- 每个分页组件接收任务列表（props传入或自行fetch），根据status筛选并渲染表格
- 表格字段与数据库字段一一对应，时间字段格式化显示
- Actions列可根据实际需求扩展（如编辑、归档、删除、还原等）

---

## 4. 示例表格头（以Processing为例）

| Transaction name | Recipients         | Created Date | Last Activity | Status      | Expiry Date | Actions   |
|------------------|-------------------|--------------|--------------|-------------|-------------|-----------|
| NDA Agreement    | a@b.com, c@d.com  | 2024-07-01   | 2024-07-02   | In Progress | 2024-07-15  | ...       |

---

如需补充字段或特殊交互，请补充说明！ 