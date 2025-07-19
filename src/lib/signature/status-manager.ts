import { SignatureTask } from '@/lib/database/queries'

// 签字任务状态类型
export type TaskStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled' | 'trashed'

// 状态转换规则定义
export interface StatusTransitionRule {
  from: TaskStatus
  to: TaskStatus[]
  description: string
}

// 状态转换历史记录
export interface StatusTransition {
  from: TaskStatus | null
  to: TaskStatus
  timestamp: string
  reason?: string
}

// 时间戳更新规则
export interface TimestampUpdate {
  field: keyof SignatureTask
  value: string
}

/**
 * 签字任务状态管理器
 * 处理状态转换、验证和时间戳更新
 */
export class TaskStatusManager {
  
  // 状态转换规则矩阵
  private static readonly TRANSITION_RULES: StatusTransitionRule[] = [
    {
      from: 'draft',
      to: ['in_progress', 'cancelled', 'trashed'],
      description: '草稿状态可以开始进行、取消或移至垃圾箱'
    },
    {
      from: 'in_progress', 
      to: ['completed', 'cancelled', 'trashed'],
      description: '进行中的任务可以完成、取消或移至垃圾箱'
    },
    {
      from: 'completed',
      to: ['trashed'], // 完成的任务只能移至垃圾箱
      description: '已完成的任务只能移至垃圾箱'
    },
    {
      from: 'cancelled',
      to: ['draft', 'trashed'], // 取消的任务可以重新开始或移至垃圾箱
      description: '已取消的任务可以重置为草稿状态或移至垃圾箱'
    },
    {
      from: 'trashed',
      to: [], // 垃圾箱中的任务不能转换（只能永久删除）
      description: '垃圾箱中的任务不能更改状态'
    }
  ]

  /**
   * 验证状态转换是否有效
   * @param currentStatus 当前状态
   * @param newStatus 目标状态
   * @returns 转换验证结果
   */
  static validateStatusTransition(
    currentStatus: TaskStatus, 
    newStatus: TaskStatus
  ): { valid: boolean; error?: string } {
    
    // 如果状态相同，无需转换
    if (currentStatus === newStatus) {
      return { valid: true }
    }

    // 查找当前状态的转换规则
    const rule = this.TRANSITION_RULES.find(r => r.from === currentStatus)
    
    if (!rule) {
      return {
        valid: false,
        error: `未知的当前状态: ${currentStatus}`
      }
    }

    // 检查目标状态是否在允许的转换列表中
    if (!rule.to.includes(newStatus)) {
      return {
        valid: false,
        error: `不能从 "${currentStatus}" 转换到 "${newStatus}"。${rule.description}`
      }
    }

    return { valid: true }
  }

  /**
   * 获取指定状态可以转换到的所有有效状态
   * @param currentStatus 当前状态
   * @returns 可转换的状态列表
   */
  static getValidTransitions(currentStatus: TaskStatus): TaskStatus[] {
    const rule = this.TRANSITION_RULES.find(r => r.from === currentStatus)
    return rule ? rule.to : []
  }

  /**
   * 根据状态变化计算需要更新的时间戳
   * @param oldStatus 原状态
   * @param newStatus 新状态
   * @returns 需要更新的时间戳字段
   */
  static calculateTimestampUpdates(
    oldStatus: TaskStatus | null,
    newStatus: TaskStatus
  ): TimestampUpdate[] {
    const updates: TimestampUpdate[] = []
    const now = new Date().toISOString()

    // 总是更新 updated_at
    updates.push({
      field: 'updated_at',
      value: now
    })

    // 根据新状态添加特定的时间戳
    switch (newStatus) {
      case 'in_progress':
        // 任务开始进行时，记录发送时间
        if (oldStatus === 'draft') {
          updates.push({
            field: 'sent_at',
            value: now
          })
        }
        break

      case 'completed':
        // 任务完成时，记录完成时间
        updates.push({
          field: 'completed_at',
          value: now
        })
        break

      case 'cancelled':
        // 任务取消时，清空完成时间（如果有的话）
        updates.push({
          field: 'completed_at',
          value: null as any // 清空完成时间
        })
        break

      case 'draft':
        // 重置为草稿时，清空相关时间戳
        if (oldStatus === 'cancelled') {
          updates.push(
            {
              field: 'sent_at',
              value: null as any
            },
            {
              field: 'completed_at', 
              value: null as any
            }
          )
        }
        break
    }

    return updates
  }

  /**
   * 执行完整的状态转换流程
   * 包括验证、时间戳计算
   * @param currentTask 当前任务对象
   * @param newStatus 目标状态
   * @returns 转换结果和更新数据
   */
  static executeStatusTransition(
    currentTask: SignatureTask,
    newStatus: TaskStatus
  ): {
    valid: boolean
    error?: string
    updates?: Partial<SignatureTask>
    transition?: StatusTransition
  } {
    
    const currentStatus = currentTask.status

    // 1. 验证状态转换
    const validation = this.validateStatusTransition(currentStatus, newStatus)
    if (!validation.valid) {
      return {
        valid: false,
        error: validation.error
      }
    }

    // 2. 计算时间戳更新
    const timestampUpdates = this.calculateTimestampUpdates(currentStatus, newStatus)
    
    // 3. 构建更新对象
    const updates: Partial<SignatureTask> = {
      status: newStatus
    }

    // 应用时间戳更新
    timestampUpdates.forEach(update => {
      ;(updates as any)[update.field] = update.value
    })

    // 4. 创建转换记录
    const transition: StatusTransition = {
      from: currentStatus,
      to: newStatus,
      timestamp: new Date().toISOString()
    }

    return {
      valid: true,
      updates,
      transition
    }
  }

  /**
   * 获取状态的中文描述
   * @param status 状态
   * @returns 中文描述
   */
  static getStatusDescription(status: TaskStatus): string {
    const descriptions = {
      draft: '草稿',
      in_progress: '进行中',
      completed: '已完成', 
      cancelled: '已取消',
      trashed: '垃圾箱'
    }
    return descriptions[status] || status
  }

  /**
   * 获取状态转换的详细信息
   * @param from 源状态
   * @param to 目标状态
   * @returns 转换详情
   */
  static getTransitionInfo(from: TaskStatus, to: TaskStatus): {
    description: string
    action: string
  } {
    const transitions = {
      'draft->in_progress': {
        description: '任务开始执行，发送给收件人',
        action: 'start'
      },
      'draft->cancelled': {
        description: '取消草稿任务',
        action: 'cancel'
      },
      'in_progress->completed': {
        description: '任务完成，所有签字收集完毕',
        action: 'complete'
      },
      'in_progress->cancelled': {
        description: '取消进行中的任务',
        action: 'cancel'
      },
      'cancelled->draft': {
        description: '重新启用已取消的任务',
        action: 'reactivate'
      }
    }

    const key = `${from}->${to}` as keyof typeof transitions
    return transitions[key] || {
      description: `从 ${this.getStatusDescription(from)} 转换到 ${this.getStatusDescription(to)}`,
      action: 'update'
    }
  }
}

/**
 * 状态管理工具函数
 */

/**
 * 检查任务是否可以编辑
 * @param status 任务状态
 * @returns 是否可以编辑
 */
export function isTaskEditable(status: TaskStatus): boolean {
  return status === 'draft' || status === 'cancelled'
}

/**
 * 检查任务是否已最终确定（不可逆状态）
 * @param status 任务状态
 * @returns 是否为最终状态
 */
export function isTaskFinalized(status: TaskStatus): boolean {
  return status === 'completed'
}

/**
 * 检查任务是否可以添加文件
 * @param status 任务状态
 * @returns 是否可以添加文件
 */
export function canAddFiles(status: TaskStatus): boolean {
  return status === 'draft'
}

/**
 * 检查任务是否可以添加收件人
 * @param status 任务状态
 * @returns 是否可以添加收件人
 */
export function canAddRecipients(status: TaskStatus): boolean {
  return status === 'draft'
}

/**
 * 获取任务状态的样式类名（用于前端显示）
 * @param status 任务状态
 * @returns CSS类名
 */
export function getStatusClassName(status: TaskStatus): string {
  const classNames = {
    draft: 'status-draft',
    in_progress: 'status-in-progress',
    completed: 'status-completed',
    cancelled: 'status-cancelled'
  }
  return classNames[status] || 'status-unknown'
} 