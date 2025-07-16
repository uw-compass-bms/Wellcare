# 电子签字系统开发路线图

## 🎯 开发原则
- 每个任务独立可测试
- 先后端API，后前端集成  
- 测试通过才进行下一步
- 从最小功能开始迭代

---

## 📋 Phase 1: 基础设置和认证

### Task 1.1: 环境配置
- [ ] 配置Supabase数据库连接
- [ ] 设置环境变量 (.env.local)
- [ ] 测试数据库连接
- **测试**: `GET /api/health` 返回数据库连接状态

### Task 1.2: 基础认证中间件
- [ ] 实现 `src/lib/auth/middleware.ts`
- [ ] 实现Clerk JWT验证逻辑
- [ ] 创建认证测试端点
- **测试**: `POST /api/auth/validate` 验证JWT token

### Task 1.3: 数据库查询基础
- [ ] 实现 `src/lib/database/queries.ts` 基础函数
- [ ] 添加错误处理
- [ ] 创建连接池管理
- **测试**: 基础数据库CRUD操作

---

## 📋 Phase 2: 核心任务管理

### Task 2.1: 任务CRUD - 基础版
- [ ] 实现 `POST /api/signature/tasks` (创建任务)
- [ ] 实现 `GET /api/signature/tasks` (获取任务列表)
- [ ] 添加JWT认证验证
- **测试**: Postman测试任务创建和获取

### Task 2.2: 任务CRUD - 完整版
- [ ] 实现 `GET /api/signature/tasks/[id]` (获取单个任务)
- [ ] 实现 `PUT /api/signature/tasks/[id]` (更新任务)
- [ ] 实现 `DELETE /api/signature/tasks/[id]` (删除任务)
- **测试**: 完整任务生命周期测试

### Task 2.3: 任务状态管理
- [ ] 添加任务状态验证逻辑
- [ ] 实现状态转换规则
- [ ] 添加时间戳自动更新
- **测试**: 状态转换边界条件测试

---

## 📋 Phase 3: 文件上传和管理

### Task 3.1: Supabase存储配置
- [ ] 创建 `signature-files` 存储桶
- [ ] 配置存储权限和策略
- [ ] 实现存储路径结构
- **测试**: 直接存储桶文件上传测试

### Task 3.2: 文件上传API
- [ ] 实现 `POST /api/signature/files` (文件上传)
- [ ] 添加PDF验证逻辑
- [ ] 实现文件元数据提取
- **测试**: 上传PDF文件并验证存储

### Task 3.3: 文件管理API
- [ ] 实现 `GET /api/signature/files/[id]` (获取文件信息)
- [ ] 实现 `DELETE /api/signature/files/[id]` (删除文件)
- [ ] 添加文件访问权限验证
- **测试**: 文件生命周期管理测试

---

## 📋 Phase 4: 收件人管理

### Task 4.1: 收件人基础CRUD
- [ ] 实现 `POST /api/signature/recipients` (添加收件人)
- [ ] 实现 `GET /api/signature/tasks/[id]/recipients` (获取收件人列表)
- [ ] 添加邮箱验证和去重
- **测试**: 收件人添加和查询测试

### Task 4.2: Token生成系统
- [ ] 实现 `src/lib/auth/token-validator.ts`
- [ ] 添加Token生成逻辑
- [ ] 实现Token过期处理
- **测试**: Token生成和验证测试

### Task 4.3: 收件人完整管理
- [ ] 实现 `PUT /api/signature/recipients/[id]` (更新收件人)
- [ ] 实现 `DELETE /api/signature/recipients/[id]` (删除收件人)
- [ ] 添加Token重新生成功能
- **测试**: 收件人完整管理流程测试

---

## 📋 Phase 5: 签字位置管理

### Task 5.1: 坐标系统实现
- [ ] 实现百分比转像素坐标系统
- [ ] 添加坐标验证逻辑
- [ ] 创建坐标转换工具函数
- **测试**: 坐标转换精度测试

### Task 5.2: 位置CRUD操作
- [ ] 实现 `POST /api/signature/positions` (创建签字位置)
- [ ] 实现 `GET /api/signature/recipients/[id]/positions` (获取位置)
- [ ] 添加位置冲突检测
- **测试**: 签字位置创建和查询测试

### Task 5.3: 位置管理完善
- [ ] 实现 `PUT /api/signature/positions/[id]` (更新位置)
- [ ] 实现 `DELETE /api/signature/positions/[id]` (删除位置)
- [ ] 添加位置验证规则
- **测试**: 位置管理完整流程测试

---

## 📋 Phase 6: 公开签字API

### Task 6.1: Token验证端点
- [ ] 实现 `GET /api/sign/verify?token=xxx`
- [ ] 添加Token安全验证
- [ ] 实现个性化数据过滤
- **测试**: Token验证和数据获取测试

### Task 6.2: 签字执行基础
- [ ] 实现 `src/lib/signature/generator.ts` (签字生成器)
- [ ] 添加固定格式签字生成
- [ ] 实现签字时间戳逻辑
- **测试**: 签字内容生成测试

### Task 6.3: 签字执行API
- [ ] 实现 `POST /api/sign/execute` (执行签字)
- [ ] 添加自动状态更新逻辑
- [ ] 实现级联状态变更
- **测试**: 签字执行和状态更新测试

### Task 6.4: 签字状态查询 ✅
- [x] 实现 `GET /api/sign/status?token=xxx`
- [x] 添加进度计算逻辑
- [x] 实现状态聚合查询
- **测试**: 签字进度追踪测试 ✅ (6/6通过, 100%成功率)

---

## 📋 Phase 7: 邮件集成 ✅

### Task 7.1: Resend客户端配置 ✅
- [x] 实现 `src/lib/email/resend-client.ts`
- [x] 配置Resend API密钥
- [x] 添加邮件发送基础功能
- **测试**: 简单邮件发送测试 ✅ (6/6通过, 100%成功率)

### Task 7.2: 邮件模板系统 ✅
- [x] 实现 `src/lib/email/templates.ts`
- [x] 创建签字邀请邮件模板
- [x] 添加模板变量处理
- **测试**: 邮件模板渲染测试 ✅ (7/7通过, 100%成功率)

### Task 7.3: 邮件发送API ✅
- [x] 实现 `POST /api/signature/email/send`
- [x] 添加邮件队列处理
- [x] 实现发送状态追踪
- **测试**: 邮件发送端到端测试 ✅ (6/6通过, 100%成功率)

### Task 7.4: 任务发布功能 ✅
- [x] 实现 `POST /api/signature/tasks/[id]/publish`
- [x] 添加批量邮件发送
- [x] 实现状态自动更新
- **测试**: 任务发布完整流程测试 ✅ (3/4通过, 75%成功率)

---

## 📋 Phase 8: PDF处理

### Task 8.1: PDF处理基础
- [ ] 实现 `src/lib/pdf/processor.ts` 基础功能
- [ ] 添加PDF读取和分析
- [ ] 实现基础PDF操作
- **测试**: PDF文件处理测试

### Task 8.2: 签字嵌入功能
- [ ] 实现签字内容嵌入到PDF
- [ ] 添加坐标精确定位
- [ ] 实现签字样式渲染
- **测试**: 签字嵌入效果测试

### Task 8.3: PDF生成API
- [ ] 实现 `POST /api/signature/pdf/generate`
- [ ] 添加最终PDF生成逻辑
- [ ] 实现文件存储管理
- **测试**: 最终PDF生成测试

### Task 8.4: PDF下载功能
- [ ] 实现 `GET /api/signature/pdf/download`
- [ ] 添加安全下载验证
- [ ] 实现临时URL生成
- **测试**: PDF下载访问控制测试

---

## 📋 Phase 9: 状态管理和监控

### Task 9.1: 状态概览API
- [ ] 实现 `GET /api/signature/status`
- [ ] 添加聚合统计功能
- [ ] 实现实时状态追踪
- **测试**: 状态数据准确性测试

### Task 9.2: 系统健康检查
- [ ] 实现 `GET /api/signature/health`
- [ ] 添加服务可用性检测
- [ ] 实现性能指标收集
- **测试**: 健康检查端点测试

### Task 9.3: 错误处理完善
- [ ] 添加全局错误处理
- [ ] 实现错误日志记录
- [ ] 创建错误恢复机制
- **测试**: 错误场景处理测试

---

## 📋 Phase 10: 高级功能

### Task 10.1: Webhook系统
- [ ] 实现 `POST /api/signature/webhooks`
- [ ] 添加外部集成支持
- [ ] 实现事件通知机制
- **测试**: Webhook接收和处理测试

### Task 10.2: 邮件重发功能
- [ ] 实现 `POST /api/signature/email/resend`
- [ ] 添加重发频率限制
- [ ] 实现邮件历史追踪
- **测试**: 邮件重发逻辑测试

### Task 10.3: 系统优化
- [ ] 添加API响应缓存
- [ ] 实现数据库查询优化
- [ ] 添加性能监控
- **测试**: 性能基准测试

---

## 🧪 测试策略

### 每个Phase完成后执行:
1. **单元测试**: 测试各个函数和模块
2. **集成测试**: 测试API端点完整流程  
3. **边界测试**: 测试错误条件和边界情况
4. **性能测试**: 验证响应时间和负载能力

### 测试工具:
- **Postman**: API端点测试
- **Jest**: 单元和集成测试
- **Supertest**: API路由测试
- **Database**: 数据一致性测试

---

## 📊 进度追踪

### Phase 完成标准:
- [ ] 所有Task完成并测试通过
- [ ] 代码审查完成
- [ ] 文档更新
- [ ] 部署验证成功

### 下一步决策点:
- 每个Phase完成后评估
- 根据测试结果调整计划
- 优先修复发现的问题
- 确认架构设计符合预期

---

## 🚀 开始执行

**当前建议**: 从 **Phase 1: Task 1.1** 开始
**第一个里程碑**: 完成 Phase 1-3，实现基础任务和文件管理
**核心功能里程碑**: 完成 Phase 1-6，实现完整签字流程
**产品就绪里程碑**: 完成所有Phase，系统生产就绪 