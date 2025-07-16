# Task 2.2 API 测试指南 - 完整CRUD功能

## 概述
这个指南说明如何测试Task 2.2的签字任务完整CRUD API端点，包括单个任务的获取、更新和删除功能。

## 前提条件
- Task 2.1 已完成并测试通过
- 系统健康检查通过
- 用户已认证

## Task 2.2 API测试

### 1. 获取单个任务详情

#### 基础请求
```bash
curl -X GET http://localhost:3000/api/signature/tasks/[task-id]
```

#### 示例（需要真实任务ID）
```bash
curl -X GET http://localhost:3000/api/signature/tasks/123e4567-e89b-12d3-a456-426614174000
```

**无认证时的期望响应** (401 Unauthorized):
```json
{
  "error": "Unauthorized",
  "message": "Unauthorized - No valid session found"
}
```

**任务不存在时的期望响应** (404 Not Found):
```json
{
  "error": "Not found",
  "message": "Task not found or access denied"
}
```

**认证成功且任务存在时的期望响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user_123",
    "title": "保险合同签字",
    "description": "需要客户签字确认保险合同条款",
    "status": "draft",
    "created_at": "2025-07-15T12:36:00.000Z",
    "updated_at": "2025-07-15T12:36:00.000Z"
  },
  "timestamp": "2025-07-15T12:36:00.000Z"
}
```

### 2. 更新任务信息

#### 更新标题
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"title": "更新后的任务标题"}'
```

#### 更新描述
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"description": "更新后的任务描述"}'
```

#### 更新状态
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

#### 批量更新
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{
    "title": "完全更新的任务",
    "description": "新的描述内容",
    "status": "completed"
  }'
```

#### 清空描述
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"description": null}'
```

**无认证时的期望响应** (401 Unauthorized):
```json
{
  "error": "Unauthorized",
  "message": "Unauthorized - No valid session found"
}
```

**成功更新时的期望响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user_123",
    "title": "更新后的任务标题",
    "description": "更新后的任务描述",
    "status": "in_progress",
    "created_at": "2025-07-15T12:36:00.000Z",
    "updated_at": "2025-07-15T13:00:00.000Z"
  },
  "message": "Task updated successfully",
  "timestamp": "2025-07-15T13:00:00.000Z"
}
```

### 3. 删除任务

#### 基础删除请求
```bash
curl -X DELETE http://localhost:3000/api/signature/tasks/[task-id]
```

**无认证时的期望响应** (401 Unauthorized):
```json
{
  "error": "Unauthorized",
  "message": "Unauthorized - No valid session found"
}
```

**成功删除时的期望响应** (200 OK):
```json
{
  "success": true,
  "message": "Task deleted successfully",
  "timestamp": "2025-07-15T13:00:00.000Z"
}
```

**任务不存在时的期望响应** (404 Not Found):
```json
{
  "error": "Database error",
  "message": "Failed to delete task or task not found"
}
```

### 4. 错误情况测试

#### 无效的任务ID格式
```bash
curl -X GET http://localhost:3000/api/signature/tasks/invalid-id
```

#### 空的更新请求
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{}'
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "At least one field (title, description, status) must be provided"
}
```

#### 无效的状态值
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
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

#### 标题过长
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"title": "'$(python3 -c "print('A' * 201)")'"}' 
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "Title must be 200 characters or less"
}
```

#### 空标题
```bash
curl -X PUT http://localhost:3000/api/signature/tasks/[task-id] \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "Title must be a non-empty string"
}
```

## 完整的任务生命周期测试

### 测试流程
1. **创建任务** - 使用Task 2.1的POST API
2. **获取任务列表** - 验证任务已创建
3. **获取单个任务** - 验证任务详情
4. **更新任务状态** - draft → in_progress
5. **更新任务信息** - 修改标题和描述
6. **再次获取任务** - 验证更新成功
7. **删除任务** - 清理测试数据
8. **验证删除** - 确认任务不存在

### 示例脚本
```bash
#!/bin/bash
BASE_URL="http://localhost:3000"

echo "=== 任务生命周期测试 ==="

# 1. 创建任务
echo "1. 创建任务..."
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/signature/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "生命周期测试任务", "description": "测试任务的完整生命周期"}')

# 提取任务ID（需要有认证）
TASK_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')

if [ "$TASK_ID" != "null" ]; then
  echo "任务创建成功: $TASK_ID"
  
  # 2. 获取任务详情
  echo "2. 获取任务详情..."
  curl -s -X GET $BASE_URL/api/signature/tasks/$TASK_ID | jq
  
  # 3. 更新任务状态
  echo "3. 更新任务状态..."
  curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID \
    -H "Content-Type: application/json" \
    -d '{"status": "in_progress"}' | jq
  
  # 4. 更新任务信息
  echo "4. 更新任务信息..."
  curl -s -X PUT $BASE_URL/api/signature/tasks/$TASK_ID \
    -H "Content-Type: application/json" \
    -d '{"title": "已更新的测试任务", "description": "描述已更新"}' | jq
  
  # 5. 删除任务
  echo "5. 删除任务..."
  curl -s -X DELETE $BASE_URL/api/signature/tasks/$TASK_ID | jq
  
  # 6. 验证删除
  echo "6. 验证任务已删除..."
  curl -s -X GET $BASE_URL/api/signature/tasks/$TASK_ID | jq
else
  echo "任务创建失败，可能需要认证"
fi
```

## Postman 测试集合扩展

### 新增的测试请求
```
├── Task 2.2 - Complete CRUD
│   ├── GET Single Task
│   │   ├── Valid Task ID
│   │   ├── Invalid Task ID
│   │   └── Non-existent Task ID
│   ├── PUT Update Task
│   │   ├── Update Title Only
│   │   ├── Update Description Only
│   │   ├── Update Status Only
│   │   ├── Update All Fields
│   │   ├── Clear Description
│   │   └── Error Cases
│   │       ├── Empty Update
│   │       ├── Invalid Status
│   │       ├── Empty Title
│   │       └── Title Too Long
│   └── DELETE Task
│       ├── Valid Task ID
│       └── Non-existent Task ID
```

### 环境变量扩展
在Postman中添加：
- `task_id`: 用于测试的任务ID
- `random_title`: `{{$randomWords}} 签字任务`

## 测试清单

### ✅ Task 2.2 测试完成条件
- [ ] GET单个任务 - 认证保护正常
- [ ] GET单个任务 - 404错误处理正确
- [ ] GET单个任务 - 返回完整任务数据
- [ ] PUT更新任务 - 所有字段更新功能正常
- [ ] PUT更新任务 - 部分字段更新功能正常
- [ ] PUT更新任务 - 字段验证正确工作
- [ ] PUT更新任务 - 状态验证正确工作
- [ ] DELETE任务 - 成功删除响应正确
- [ ] DELETE任务 - 权限验证正常
- [ ] 完整生命周期测试通过

### 数据库验证查询
```sql
-- 验证任务更新
SELECT * FROM signature_tasks WHERE id = 'your-task-id';

-- 验证任务删除
SELECT COUNT(*) FROM signature_tasks WHERE id = 'deleted-task-id';
```

## 下一步
Task 2.2完成后，继续：
- **Task 2.3**: 实现任务状态管理和转换规则
- **Phase 3**: 开始文件上传和管理功能 