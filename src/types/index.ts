export type UserRole = "manager" | "employee";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  instructions?: string;
  requiresPhoto: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface PersonalTask {
  id: string;
  title: string;
  instructions?: string;
  requiresPhoto: boolean;
  createdBy: string;
  createdAt: Date;
  isRecurring: boolean;
  status: 'pending' | 'completed';
  completedAt?: Date;
  photoUrl?: string;
}

export interface AssignedTask {
  id: string;
  taskId: string;
  userId: string;
  assignedBy: string;
  assignedAt: Date;
}

export interface DailyTaskStatus {
  id: string;
  assignedTaskId: string;
  userId: string;
  date: string; // format: yyyy-mm-dd
  isCompleted: boolean;
  completedAt?: Date;
  photoUrl?: string;
}

export interface EmployeeWithTasks {
  uid: string;
  displayName: string;
  email: string;
  assignedTasks: Array<{
    task: Task;
    status: DailyTaskStatus | null;
  }>;
}

// Task history interfaces
export interface TaskHistoryItem {
  id: string;
  task: Task;
  date: string; // yyyy-mm-dd format
  completedAt: Date;
  photoUrl?: string;
  assignedTaskId: string;
}

export interface GroupedTaskHistory {
  month: string; // Month YYYY format
  days: {
    date: string; // yyyy-mm-dd format
    displayDate: string; // Formatted display date
    tasks: TaskHistoryItem[];
  }[];
}

export interface CalendarData {
  date: string; // yyyy-mm-dd format
  count: number;
  level: number; // 0-4 intensity level
} 