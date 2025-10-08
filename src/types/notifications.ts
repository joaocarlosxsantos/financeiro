export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  isActive: boolean;
  data?: NotificationData;
  scheduledFor?: Date;
  triggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertConfiguration {
  id: string;
  userId: string;
  type: AlertConfigType;
  isEnabled: boolean;
  thresholdAmount?: number;
  thresholdPercent?: number;
  categoryIds: string[];
  walletIds: string[];
  settings?: AlertSettings;
  createdAt: Date;
  updatedAt: Date;
}

export enum NotificationType {
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  UNUSUAL_SPENDING = 'UNUSUAL_SPENDING',
  LOW_BALANCE = 'LOW_BALANCE',
  GOAL_AT_RISK = 'GOAL_AT_RISK',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  RECURRING_DUE = 'RECURRING_DUE',
  MONTHLY_SUMMARY = 'MONTHLY_SUMMARY',
  ACHIEVEMENT = 'ACHIEVEMENT',
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum AlertConfigType {
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  UNUSUAL_SPENDING = 'UNUSUAL_SPENDING',
  LOW_BALANCE = 'LOW_BALANCE',
  GOAL_AT_RISK = 'GOAL_AT_RISK',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  RECURRING_DUE = 'RECURRING_DUE',
  MONTHLY_SUMMARY = 'MONTHLY_SUMMARY',
}

// Data structures for different notification types
export interface NotificationData {
  // Budget exceeded
  budgetData?: {
    categoryId: string;
    categoryName: string;
    budgetAmount: number;
    currentAmount: number;
    percentageUsed: number;
  };
  
  // Unusual spending
  unusualSpendingData?: {
    amount: number;
    categoryId: string;
    categoryName: string;
    averageAmount: number;
    percentageIncrease: number;
    transactionId: string;
  };
  
  // Low balance
  lowBalanceData?: {
    walletId: string;
    walletName: string;
    currentBalance: number;
    thresholdAmount: number;
  };
  
  // Goal at risk
  goalData?: {
    goalId: string;
    goalTitle: string;
    targetAmount: number;
    currentAmount: number;
    percentageComplete: number;
    daysRemaining?: number;
  };
  
  // Duplicate transaction
  duplicateData?: {
    originalTransactionId: string;
    duplicateTransactionId: string;
    amount: number;
    description: string;
    date: string;
  };
  
  // Recurring due
  recurringData?: {
    transactionId: string;
    description: string;
    amount: number;
    dueDate: string;
    type: 'expense' | 'income';
  };
  
  // Monthly summary
  summaryData?: {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    topCategories: Array<{
      name: string;
      amount: number;
    }>;
  };
  
  // Achievement
  achievementData?: {
    title: string;
    description: string;
    goalId?: string;
    amount?: number;
  };
}

// Settings for different alert types
export interface AlertSettings {
  // Budget exceeded settings
  budgetSettings?: {
    notifyAt?: number[]; // Array of percentages (e.g., [80, 90, 100])
    includeProjected?: boolean; // Include projected spending
  };
  
  // Unusual spending settings
  unusualSpendingSettings?: {
    minimumAmount?: number;
    percentageThreshold?: number; // E.g., 50% above average
    lookbackDays?: number; // How many days to look back for average
  };
  
  // Low balance settings
  lowBalanceSettings?: {
    minimumAmount?: number;
    percentageOfAverage?: number; // E.g., 20% of average balance
  };
  
  // Goal at risk settings
  goalSettings?: {
    daysBeforeDeadline?: number;
    percentageThreshold?: number; // E.g., if less than 50% complete with 30% time left
    goalIds?: string[]; // Specific goals to monitor, empty = all goals
  };
  
  // Duplicate detection settings
  duplicateSettings?: {
    timeWindowHours?: number; // Time window to check for duplicates
    amountTolerance?: number; // Amount tolerance for matching
    descriptionSimilarity?: number; // Percentage similarity for descriptions
  };
  
  // Recurring reminder settings
  recurringSettings?: {
    daysBefore?: number[]; // Days before due date to notify
    includeOverdue?: boolean;
  };
}

// API request/response types
export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: NotificationData;
  scheduledFor?: Date;
}

export interface UpdateNotificationRequest {
  isRead?: boolean;
  isActive?: boolean;
}

export interface NotificationFilter {
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Utility types
export interface NotificationIcon {
  icon: string;
  color: string;
  bgColor: string;
}

export const NOTIFICATION_ICONS: Record<NotificationType, NotificationIcon> = {
  [NotificationType.BUDGET_EXCEEDED]: {
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.UNUSUAL_SPENDING]: {
    icon: 'TrendingUp',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  [NotificationType.LOW_BALANCE]: {
    icon: 'AlertCircle',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  [NotificationType.GOAL_AT_RISK]: {
    icon: 'Target',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  [NotificationType.DUPLICATE_TRANSACTION]: {
    icon: 'Copy',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.RECURRING_DUE]: {
    icon: 'Calendar',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  [NotificationType.MONTHLY_SUMMARY]: {
    icon: 'FileText',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  [NotificationType.ACHIEVEMENT]: {
    icon: 'Award',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  [NotificationType.SYSTEM]: {
    icon: 'Info',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  [NotificationType.CUSTOM]: {
    icon: 'Bell',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
};

export const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  [NotificationPriority.LOW]: 'text-gray-500',
  [NotificationPriority.MEDIUM]: 'text-blue-500',
  [NotificationPriority.HIGH]: 'text-orange-500',
  [NotificationPriority.URGENT]: 'text-red-500',
};