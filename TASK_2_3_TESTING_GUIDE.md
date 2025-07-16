# Task 2.3 API 测试指南 - 任务状态管理

## 概述
这个指南说明如何测试Task 2.3的任务状态管理功能，包括状态转换规则、验证逻辑和时间戳自动更新。

## 前提条件
- Task 2.1 和 Task 2.2 已完成并测试通过
- 系统健康检查通过
- 用户已认证
- 至少有一个测试任务存在

## 状态转换规则矩阵

### 允许的状态转换
| 当前状态 | 可转换到 | 描述 |
|----------|----------|------|
| `draft` | `in_progress`, `cancelled` | 草稿状态可以开始进行或取消 |
| `in_progress` | `completed`, `cancelled` | 进行中的任务可以完成或取消 |
| `completed` | (无) | 已完成的任务不能更改状态 |
| `cancelled` | `draft` | 已取消的任务只能重置为草稿状态 |

### 时间戳更新规则
| 状态转换 | 更新字段 | 说明 |
|----------|----------|------|
| `draft` → `in_progress` | `sent_at`, `updated_at` | 记录任务发送时间 |
| 任何 → `completed` | `completed_at`, `updated_at` | 记录任务完成时间 |
| 任何 → `cancelled` | `completed_at=null`, `updated_at` | 清空完成时间 |
| `cancelled` → `draft` | `sent_at=null`, `completed_at=null`, `updated_at` | 重置所有时间戳 |

## Task 2.3 API测试

### 1. 状态信息查询

#### 获取任务状态信息
```bash
curl -X GET http://localhost:3000/api/signature/tasks/[task-id]/status
```

**认证成功时的期望响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "task_id": "123e4567-e89b-12d3-a456-426614174000",
    "current_status": "draft",
    "current_status_description": "草稿",
    "valid_transitions": ["in_progress", "cancelled"],
    "transition_details": [
      {
        "to": "in_progress",
        "description": "进行中",
        "transition_info": {
          "description": "任务开始执行，发送给收件人",
          "action": "start"
        }
      },
      {
        "to": "cancelled",
        "description": "已取消",
        "transition_info": {
          "description": "取消草稿任务",
          "action": "cancel"
        }
      }
    ],
    "timestamps": {
      "created_at": "2025-07-15T12:36:00.000Z",
      "updated_at": "2025-07-15T12:36:00.000Z",
      "sent_at": null,
      "completed_at": null
    }
  },
  "timestamp": "2025-07-15T13:00:00.000Z"
}
```

### 2. 状态转换测试

#### 有效的状态转换

##### 从草稿到进行中
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id]/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "reason": "开始任务执行"}'
```

**期望响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "in_progress",
    "sent_at": "2025-07-15T13:05:00.000Z",
    "updated_at": "2025-07-15T13:05:00.000Z"
  },
  "transition": {
    "from": "draft",
    "from_description": "草稿",
    "to": "in_progress",
    "to_description": "进行中",
    "timestamp": "2025-07-15T13:05:00.000Z",
    "reason": "开始任务执行",
    "info": {
      "description": "任务开始执行，发送给收件人",
      "action": "start"
    }
  },
  "message": "Task status updated: 任务开始执行，发送给收件人",
  "timestamp": "2025-07-15T13:05:00.000Z"
}
```

##### 从进行中到已完成
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id]/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "reason": "所有签字已收集完毕"}'
```

##### 从已完成到取消（应该失败）
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id]/status \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled"}'
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Status transition error",
  "message": "不能从 \"completed\" 转换到 \"cancelled\"。已完成的任务不能更改状态",
  "current_status": "completed",
  "current_status_description": "已完成",
  "attempted_status": "cancelled",
  "attempted_status_description": "已取消",
  "valid_transitions": [],
  "reason": null
}
```

### 3. 边界条件测试

#### 无效状态值
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id]/status \
  -H "Content-Type: application/json" \
  -d '{"status": "invalid_status"}'
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "Status must be one of: draft, in_progress, completed, cancelled"
}
```

#### 缺少状态字段
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id]/status \
  -H "Content-Type: application/json" \
  -d '{"reason": "无状态字段"}'
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "Status is required and must be a string"
}
```

#### 相同状态转换（应该成功但无实际变更）
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id]/status \
  -H "Content-Type: application/json" \
  -d '{"status": "draft"}'
```

#### 不存在的任务ID
```bash
curl -X GET http://localhost:3000/api/signature/tasks/00000000-0000-0000-0000-000000000000/status
```

**期望响应** (404 Not Found):
```json
{
  "error": "Not found",
  "message": "Task not found or access denied"
}
```

### 4. 通过普通更新API测试状态管理

#### 通过PUT /api/signature/tasks/[id] 更新状态
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

这应该也会触发状态转换验证，并在违反规则时返回详细的错误信息。

## 完整的状态转换流程测试

### 测试场景 1: 正常任务流程
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
TASK_ID="your-task-id"

echo "=== 正常任务状态转换流程测试 ==="

# 1. 检查初始状态 (应该是 draft)
echo "1. 检查初始状态..."
curl -s -X GET $BASE_URL/api/signature/tasks/$TASK_ID/status | jq

# 2. 开始任务 (draft → in_progress)
echo "2. 开始任务..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "reason": "测试开始任务"}' | jq

# 3. 完成任务 (in_progress → completed)
echo "3. 完成任务..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "reason": "测试完成任务"}' | jq

# 4. 尝试修改已完成任务 (should fail)
echo "4. 尝试修改已完成任务..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "draft"}' | jq
```

### 测试场景 2: 取消和重启流程
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
TASK_ID="your-task-id"

echo "=== 取消和重启流程测试 ==="

# 1. 取消草稿任务 (draft → cancelled)
echo "1. 取消草稿任务..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled", "reason": "测试取消任务"}' | jq

# 2. 重新启动任务 (cancelled → draft)
echo "2. 重新启动任务..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "draft", "reason": "重新启动任务"}' | jq

# 3. 检查时间戳重置
echo "3. 检查时间戳是否正确重置..."
curl -s -X GET $BASE_URL/api/signature/tasks/$TASK_ID/status | jq '.data.timestamps'
```

### 测试场景 3: 错误条件测试
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
TASK_ID="your-task-id"

echo "=== 错误条件测试 ==="

# 1. 尝试无效转换 (draft → completed 跳过 in_progress)
echo "1. 尝试跳跃状态转换..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' | jq

# 2. 无效状态值
echo "2. 测试无效状态值..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status": "unknown"}' | jq

# 3. 缺少必需字段
echo "3. 测试缺少状态字段..."
curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

## 时间戳验证测试

### 验证时间戳更新
在每次状态转换后，验证相应的时间戳是否正确更新：

```sql
-- 在Supabase数据库中验证
SELECT 
  id, 
  status, 
  created_at,
  updated_at,
  sent_at,
  completed_at
FROM signature_tasks 
WHERE id = 'your-task-id';
```

### 时间戳验证清单
- [ ] `draft` → `in_progress`: `sent_at` 被设置，`updated_at` 被更新
- [ ] 任何状态 → `completed`: `completed_at` 被设置，`updated_at` 被更新
- [ ] 任何状态 → `cancelled`: `completed_at` 被清空，`updated_at` 被更新
- [ ] `cancelled` → `draft`: `sent_at` 和 `completed_at` 都被清空

## Postman 测试集合

### 环境变量
在Postman中设置：
- `base_url`: `http://localhost:3000`
- `task_id`: 测试任务的ID
- `auth_token`: 认证令牌（如果需要）

### 测试集合结构
```
├── Task 2.3 - Status Management
│   ├── Status Information
│   │   ├── GET Task Status Info
│   │   └── GET Non-existent Task Status
│   ├── Valid Transitions
│   │   ├── Draft to In Progress
│   │   ├── In Progress to Completed
│   │   ├── In Progress to Cancelled
│   │   └── Cancelled to Draft
│   ├── Invalid Transitions
│   │   ├── Completed to Any (Should Fail)
│   │   ├── Draft to Completed (Skip In Progress)
│   │   └── Same Status Transition
│   ├── Validation Errors
│   │   ├── Invalid Status Value
│   │   ├── Missing Status Field
│   │   └── Invalid JSON Format
│   └── Timestamp Verification
│       ├── Check Timestamps After Each Transition
│       └── Verify Timestamp Reset on Reactivation
```

## 测试清单

### ✅ Task 2.3 测试完成条件
- [ ] 状态信息查询API正常工作
- [ ] 所有有效状态转换成功执行
- [ ] 所有无效状态转换被正确拒绝
- [ ] 状态转换错误信息详细且有帮助
- [ ] 时间戳在状态转换时正确更新
- [ ] 边界条件正确处理
- [ ] 通过普通更新API的状态管理集成正常
- [ ] 完整的任务生命周期测试通过
- [ ] 取消和重启流程正常工作
- [ ] 错误响应格式一致且信息丰富

### 数据库完整性验证
```sql
-- 验证状态转换规则在数据库级别得到执行
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as earliest,
  MAX(updated_at) as latest
FROM signature_tasks 
GROUP BY status;

-- 验证时间戳逻辑
SELECT 
  status,
  CASE 
    WHEN status = 'draft' AND sent_at IS NULL THEN 'OK'
    WHEN status = 'in_progress' AND sent_at IS NOT NULL THEN 'OK'
    WHEN status = 'completed' AND completed_at IS NOT NULL THEN 'OK'
    ELSE 'INCONSISTENT'
  END as timestamp_status
FROM signature_tasks;
```

## 下一步
Task 2.3完成后，继续：
- **Phase 3: Task 3.1**: Supabase存储配置
- **Phase 3: Task 3.2**: 文件上传API实现
- **Phase 3: Task 3.3**: 文件管理API完善 