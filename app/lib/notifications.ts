import { prisma } from "./db";

export interface NotificationData {
  type: string;
  data: Record<string, any>;
  workspaceId?: string;
  userId?: string;
}

export async function sendNotification(notification: NotificationData) {
  try {
    // Send event to real-time stream
    const eventPayload = {
      type: notification.type,
      data: notification.data,
      workspaceId: notification.workspaceId,
      targetUserId: notification.userId,
    };

    // In a real implementation, this would send to Redis or message queue
    // For now, we'll just log the notification
    console.log('Notification sent:', eventPayload);

    // Also log to database for audit
    if (notification.userId) {
      await prisma.activityLog.create({
        data: {
          userId: notification.userId,
          workspaceId: notification.workspaceId || null,
          action: `Notification: ${notification.type}`,
          entityType: 'notification',
          details: JSON.stringify(notification.data),
        },
      });
    }

    return { success: true, eventId: Date.now().toString() };
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendUploadNotification(
  type: 'upload_started' | 'upload_progress' | 'upload_completed' | 'upload_failed',
  fileData: {
    id: string;
    name: string;
    size: number;
    progress?: number;
    error?: string;
    uploadedBy: string;
    workspaceId?: string;
  }
) {
  const notificationData: NotificationData = {
    type: `file_${type}`,
    data: {
      fileId: fileData.id,
      fileName: fileData.name,
      fileSize: fileData.size,
      progress: fileData.progress,
      error: fileData.error,
      uploadedBy: fileData.uploadedBy,
      timestamp: new Date().toISOString(),
    },
    workspaceId: fileData.workspaceId,
    userId: fileData.uploadedBy,
  };

  return await sendNotification(notificationData);
}