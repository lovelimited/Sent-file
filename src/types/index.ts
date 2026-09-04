import type {
  Database,
  UserRole,
  TaskPriority,
  TaskStatus,
  AssignmentStatus,
  ChannelType,
  NotificationType,
  DriveResourceCategory,
} from './database.types'

export type {
  Database,
  UserRole,
  TaskPriority,
  TaskStatus,
  AssignmentStatus,
  ChannelType,
  NotificationType,
  DriveResourceCategory,
}

export type UserGroup = Database['public']['Tables']['user_groups']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type AuthIdentity = Database['public']['Tables']['auth_identities']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskAssignment = Database['public']['Tables']['task_assignments']['Row']
export type ChatChannel = Database['public']['Tables']['chat_channels']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type AppNotification = Database['public']['Tables']['notifications']['Row']
export type DriveResource = Database['public']['Tables']['drive_resources']['Row']

export interface SubtaskItem {
  id: string
  title: string
  completed?: boolean
}

export interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  isConfigured: boolean
}
