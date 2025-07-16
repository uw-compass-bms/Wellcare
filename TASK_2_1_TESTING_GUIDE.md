# Task 2.1 API 测试指南

## 概述
这个指南说明如何测试Task 2.1的签字任务基础CRUD API端点。

## 系统状态检查

### 1. 检查系统健康状态
```bash
curl -X GET http://localhost:3000/api/health
```

**期望响应** (200 OK):
```json
{
  "timestamp": "2025-07-15T12:36:18.737Z",
  "status": "healthy",
  "services": {
    "database": {"status": "healthy", "message": "Database connected and signature tables exist"},
    "storage": {"status": "healthy", "message": "Storage bucket exists and accessible"},
    "auth": {"status": "healthy", "message": "Auth service accessible with admin privileges"}
  }
}
```

### 2. 检查认证状态
```bash
curl -X GET http://localhost:3000/api/auth/validate
```

**期望响应** (401 Unauthorized - 无认证时):
```json
{
  "timestamp": "2025-07-15T12:36:13.429Z",
  "authenticated": false,
  "userId": null,
  "sessionId": null,
  "error": "Unauthorized - No valid session found"
}
```

## Task 2.1 API测试

### 1. 获取签字任务列表

#### 基础请求
```bash
curl -X GET http://localhost:3000/api/signature/tasks
```

#### 带状态过滤的请求
```bash
curl -X GET "http://localhost:3000/api/signature/tasks?status=draft"
curl -X GET "http://localhost:3000/api/signature/tasks?status=in_progress"
curl -X GET "http://localhost:3000/api/signature/tasks?status=completed"
```

**无认证时的期望响应** (401 Unauthorized):
```json
{
  "error": "Unauthorized",
  "message": "Unauthorized - No valid session found"
}
```

**认证成功后的期望响应** (200 OK):
```json
{
  "success": true,
  "data": [],
  "count": 0,
  "timestamp": "2025-07-15T12:36:00.000Z"
}
```

### 2. 创建新的签字任务

#### 最小有效请求
```bash
curl -X POST http://localhost:3000/api/signature/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "我的第一个签字任务"}'
```

#### 完整请求
```bash
curl -X POST http://localhost:3000/api/signature/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "保险合同签字",
    "description": "需要客户签字确认保险合同条款"
  }'
```

**无认证时的期望响应** (401 Unauthorized):
```json
{
  "error": "Unauthorized", 
  "message": "Unauthorized - No valid session found"
}
```

**认证成功后的期望响应** (201 Created):
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
  "message": "Task created successfully",
  "timestamp": "2025-07-15T12:36:00.000Z"
}
```

### 3. 错误情况测试

#### 无效的JSON格式
```bash
curl -X POST http://localhost:3000/api/signature/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "测试任务"'
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Invalid request",
  "message": "Request body must be valid JSON"
}
```

#### 缺少标题
```bash
curl -X POST http://localhost:3000/api/signature/tasks \
  -H "Content-Type: application/json" \
  -d '{"description": "没有标题的任务"}'
```

**期望响应** (400 Bad Request):
```json
{
  "error": "Validation error",
  "message": "Title is required and must be a non-empty string"
}
```

#### 标题过长
```bash
curl -X POST http://localhost:3000/api/signature/tasks \
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

## Postman 测试集合

### 环境变量
在Postman中设置以下环境变量：
- `base_url`: `http://localhost:3000`
- `auth_token`: (如果使用Bearer token认证)

### 测试集合结构
```
├── System Health
│   ├── GET Health Check
│   └── GET Auth Validate
├── Task 2.1 - Basic CRUD
│   ├── GET All Tasks
│   ├── GET Tasks by Status (Draft)
│   ├── GET Tasks by Status (In Progress)
│   ├── POST Create Task (Minimal)
│   ├── POST Create Task (Full)
│   └── Error Cases
│       ├── POST Invalid JSON
│       ├── POST Missing Title
│       └── POST Title Too Long
```

### 示例请求设置

#### GET所有任务
- Method: `GET`
- URL: `{{base_url}}/api/signature/tasks`
- Headers: 如果有认证token，添加 `Authorization: Bearer {{auth_token}}`

#### POST创建任务
- Method: `POST`
- URL: `{{base_url}}/api/signature/tasks`
- Headers:
  - `Content-Type: application/json`
  - 如果有认证token，添加 `Authorization: Bearer {{auth_token}}`
- Body (raw JSON):
```json
{
  "title": "{{$randomWords}}签字任务",
  "description": "这是一个{{$randomWords}}的测试任务描述"
}
```

## 测试清单

### ✅ Task 2.1 测试完成条件
- [ ] 系统健康检查通过
- [ ] 认证验证正常工作
- [ ] GET /api/signature/tasks 未认证时返回401
- [ ] GET /api/signature/tasks 认证后返回空数组（初始状态）
- [ ] POST /api/signature/tasks 能成功创建任务
- [ ] POST /api/signature/tasks 验证字段正确工作
- [ ] 状态过滤查询正常工作
- [ ] 错误处理和响应格式一致

### 数据库验证
创建任务后，可以直接查询Supabase数据库验证：
```sql
SELECT * FROM signature_tasks ORDER BY created_at DESC LIMIT 5;
```

## 下一步
Task 2.1完成后，继续：
- **Task 2.2**: 实现单个任务获取、更新、删除API
- **Task 2.3**: 实现任务状态管理和转换规则 