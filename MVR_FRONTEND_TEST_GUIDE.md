# MVR Frontend Test Guide

## 🎯 测试目标
测试MVR前端展示功能，包括数据展示和删除功能

## 📋 测试步骤

### 1. 数据库准备
确保您已经在Supabase中执行了 `mvr_test_database_fixed.sql` 脚本

### 2. 访问页面
1. 启动应用程序
2. 访问 `/app/client-management`
3. 确保您已经登录

### 3. 测试功能

#### A. 案例展示测试
- ✅ 页面显示 "MVR Data Management" 标题
- ✅ 显示 "Select Case" 部分
- ✅ 如果有案例，显示案例卡片
- ✅ 案例卡片显示案例编号、联系人、MVR记录数量

#### B. MVR记录展示测试
1. 点击任意案例卡片
2. 检查是否正确显示：
   - ✅ 案例信息标题
   - ✅ MVR记录数量
   - ✅ 如果有MVR记录，显示详细信息

#### C. MVR记录详情测试
对于每个MVR记录，检查是否正确显示：
- ✅ 基本信息：姓名、驾照号码、性别、出生日期等
- ✅ 地址信息（如果有）
- ✅ 违规条件表格（如果有）
- ✅ 定罪记录表格（如果有）
- ✅ 来源文件信息

#### D. 删除功能测试
1. 点击MVR记录卡片右上角的 "Delete" 按钮
2. 确认删除对话框出现
3. 点击确认删除
4. 检查：
   - ✅ 按钮显示 "Deleting..." 状态
   - ✅ 记录从列表中消失
   - ✅ 案例的MVR记录数量更新

### 4. 边界情况测试
- ✅ 没有案例时显示空状态
- ✅ 没有MVR记录时显示 "No MVR records found for this case"
- ✅ 缺少某些字段时显示 "Unknown"

## 🔧 调试提示

### 如果页面加载失败：
1. 检查浏览器控制台错误
2. 确认Supabase连接配置正确
3. 确认用户已登录

### 如果删除功能失败：
1. 检查浏览器控制台错误
2. 确认数据库权限设置正确
3. 确认 `deleteMVRRecord` 函数正常工作

## 📊 数据结构验证

### MVR记录应包含：
```json
{
  "id": "uuid",
  "name": "LASTNAME,FIRSTNAME",
  "licence_number": "L40014670981008",
  "date_of_birth": "1998-10-07",
  "gender": "M",
  "class": "G",
  "status": "LICENSED",
  "issue_date": "2015-10-05",
  "expiry_date": "2028-12-31",
  "address": "Address line 1\\nAddress line 2",
  "conditions": [
    {"date": "2022-01-01", "description": "CORRECTIVE LENSES"}
  ],
  "convictions": [
    {"date": "2022-06-15", "description": "SPEEDING"}
  ]
}
```

## ✅ 成功标准
- 所有UI文本都是英文
- 数据正确显示
- 删除功能正常工作
- 没有JavaScript错误
- 响应式设计正常工作

## 🎉 测试完成后
如果所有测试通过，MVR模块优化成功！可以继续优化其他模块（AutoPlus、Quote、Application）。 