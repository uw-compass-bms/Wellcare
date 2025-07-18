# PDF 签名组件结构

## 组件层次结构

```
ProductionSignatureCanvas (主组件)
├── PDFViewer (PDF渲染)
├── FieldPalette (桌面端字段选择器)
├── MobileFieldPalette (移动端字段选择器)
├── FieldItem (字段组件)
├── VirtualizedFieldLayer (虚拟化优化层)
└── FieldPropertiesPanel (属性配置面板)
```

## 核心组件说明

### 1. ProductionSignatureCanvas
- **作用**：主画布组件，协调所有子组件
- **功能**：字段管理、状态管理、API 交互
- **路径**：`components/ProductionSignatureCanvas.tsx`

### 2. PDFViewer
- **作用**：PDF 文档渲染器
- **功能**：加载和显示 PDF，处理页面点击事件
- **依赖**：react-pdf
- **路径**：`components/PDFViewer.tsx`

### 3. FieldItem
- **作用**：单个字段的渲染和交互
- **功能**：拖拽、调整大小、显示不同字段类型
- **依赖**：react-rnd
- **路径**：`components/FieldItem.tsx`

### 4. FieldPalette / MobileFieldPalette
- **作用**：字段类型选择器
- **功能**：显示可用字段类型，处理选择事件
- **路径**：`components/FieldPalette.tsx`, `components/MobileFieldPalette.tsx`

### 5. FieldPropertiesPanel
- **作用**：字段属性配置面板
- **功能**：配置字段类型、验证规则、默认值等
- **路径**：`components/FieldPropertiesPanel.tsx`

### 6. VirtualizedFieldLayer
- **作用**：性能优化层
- **功能**：当字段数量超过 50 个时启用虚拟化渲染
- **路径**：`components/VirtualizedFieldLayer.tsx`

## Hooks

### 1. useFieldsApi
- **作用**：字段 CRUD 操作的 API 封装
- **功能**：创建、读取、更新、删除字段
- **路径**：`hooks/useFieldsApi.ts`

### 2. useFieldHistory
- **作用**：字段操作历史管理
- **功能**：撤销/重做功能
- **路径**：`hooks/useFieldHistory.ts`

### 3. useDebounce
- **作用**：防抖工具
- **功能**：减少 API 调用频率
- **路径**：`hooks/useDebounce.ts`

### 4. useClipboard
- **作用**：剪贴板操作（预留）
- **功能**：复制/粘贴字段
- **路径**：`hooks/useClipboard.ts`

## 类型定义

所有类型定义集中在 `components/FieldItem.tsx` 中：

- `FieldType`: 字段类型枚举
- `Field`: 字段数据结构
- `FieldMeta`: 字段元数据

## 数据流

1. **字段创建**：FieldPalette → ProductionSignatureCanvas → useFieldsApi → API
2. **字段更新**：FieldItem/FieldPropertiesPanel → ProductionSignatureCanvas → useFieldsApi → API
3. **字段删除**：FieldItem → ProductionSignatureCanvas → useFieldsApi → API

## 状态管理

- **本地状态**：使用 React hooks（useState, useCallback）
- **历史管理**：useFieldHistory 维护操作历史
- **持久化**：通过 API 保存到数据库

## 性能优化

1. **虚拟化渲染**：字段数量 > 50 时自动启用
2. **防抖更新**：使用 useDebounce 减少 API 调用
3. **按需渲染**：只渲染可视区域内的字段