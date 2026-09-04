export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'teacher'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
export type ChannelType = 'general' | 'announcement' | 'group'
export type NotificationType = 'task_assigned' | 'task_reviewed' | 'announcement' | 'info'
export type DriveResourceCategory = 'folder' | 'template' | 'guideline' | 'asset'

export interface Database {
  public: {
    Tables: {
      user_groups: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          username: string
          name: string
          role: UserRole
          group_id: string | null
          active: boolean
          avatar_url: string | null
          last_seen: string | null
          last_password_change: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          name: string
          role?: UserRole
          group_id?: string | null
          active?: boolean
          avatar_url?: string | null
          last_seen?: string | null
          last_password_change?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          name?: string
          role?: UserRole
          group_id?: string | null
          active?: boolean
          avatar_url?: string | null
          last_seen?: string | null
          last_password_change?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_group_id_fkey'
            columns: ['group_id']
            referencedRelation: 'user_groups'
            referencedColumns: ['id']
          },
        ]
      }
      auth_identities: {
        Row: {
          user_id: string
          username: string
          created_at: string
        }
        Insert: {
          user_id: string
          username: string
          created_at?: string
        }
        Update: {
          user_id?: string
          username?: string
          created_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          target_type: string | null
          target_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          target_type?: string | null
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          target_type?: string | null
          target_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          created_by: string
          assigned_to_role: string
          target_group_id: string | null
          due_date: string | null
          priority: TaskPriority
          status: TaskStatus
          subtasks?: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          created_by: string
          assigned_to_role?: string
          target_group_id?: string | null
          due_date?: string | null
          priority?: TaskPriority
          status?: TaskStatus
          subtasks?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          created_by?: string
          assigned_to_role?: string
          target_group_id?: string | null
          due_date?: string | null
          priority?: TaskPriority
          status?: TaskStatus
          subtasks?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_target_group_id_fkey'
            columns: ['target_group_id']
            referencedRelation: 'user_groups'
            referencedColumns: ['id']
          },
        ]
      }
      task_assignments: {
        Row: {
          id: string
          task_id: string
          teacher_id: string
          status: AssignmentStatus
          submission_note: string | null
          submission_url: string | null
          submitted_at: string | null
          feedback: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          teacher_id: string
          status?: AssignmentStatus
          submission_note?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          feedback?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          teacher_id?: string
          status?: AssignmentStatus
          submission_note?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          feedback?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'task_assignments_task_id_fkey'
            columns: ['task_id']
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_assignments_teacher_id_fkey'
            columns: ['teacher_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_assignments_reviewed_by_fkey'
            columns: ['reviewed_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_channels: {
        Row: {
          id: string
          name: string
          type: ChannelType
          group_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: ChannelType
          group_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: ChannelType
          group_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_channels_group_id_fkey'
            columns: ['group_id']
            referencedRelation: 'user_groups'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          channel_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          sender_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_channel_id_fkey'
            columns: ['channel_id']
            referencedRelation: 'chat_channels'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_sender_id_fkey'
            columns: ['sender_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          title: string
          message: string
          type: NotificationType
          link: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          title: string
          message: string
          type?: NotificationType
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          title?: string
          message?: string
          type?: NotificationType
          link?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey'
            columns: ['recipient_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      drive_resources: {
        Row: {
          id: string
          title: string
          description: string | null
          category: DriveResourceCategory
          url: string
          group_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category?: DriveResourceCategory
          url: string
          group_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: DriveResourceCategory
          url?: string
          group_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'drive_resources_group_id_fkey'
            columns: ['group_id']
            referencedRelation: 'user_groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'drive_resources_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      update_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      user_role: UserRole
      task_priority: TaskPriority
      task_status: TaskStatus
      assignment_status: AssignmentStatus
      channel_type: ChannelType
      notification_type: NotificationType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
