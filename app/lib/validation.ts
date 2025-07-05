import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(254, 'Email is too long');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, apostrophes, and hyphens');

export const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .optional();

// Input sanitization with dynamic import for DOMPurify
export async function sanitizeHtml(input: string): Promise<string> {
  try {
    // Dynamic import to avoid SSR issues
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: [],
    });
  } catch (error) {
    // Fallback to basic text sanitization if DOMPurify fails
    return sanitizeText(input);
  }
}

export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
}

// API validation schemas
export const createWorkspaceSchema = z.object({
  name: z.string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name is too long')
    .transform(sanitizeText),
  description: z.string()
    .max(500, 'Description is too long')
    .transform(sanitizeText)
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
});

export const createTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title is too long')
    .transform(sanitizeText),
  description: z.string()
    .max(2000, 'Description is too long')
    .transform(sanitizeText)
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string()
    .datetime()
    .optional(),
  assigneeId: z.string()
    .uuid('Invalid assignee ID')
    .optional(),
  workspaceId: z.string()
    .uuid('Invalid workspace ID'),
});

export const updateUserProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  bio: z.string()
    .max(500, 'Bio is too long')
    .transform(sanitizeText)
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const commentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment is too long')
    .transform(sanitizeText),
  entityType: z.enum(['TASK', 'FILE', 'WORKSPACE']),
  entityId: z.string().uuid('Invalid entity ID'),
});

export const fileUploadSchema = z.object({
  name: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename is too long')
    .transform(sanitizeFilename),
  size: z.number()
    .max(50 * 1024 * 1024, 'File size cannot exceed 50MB'), // 50MB limit
  type: z.string()
    .regex(/^[\w-]+\/[\w-]+$/, 'Invalid MIME type'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
  folderId: z.string().uuid('Invalid folder ID').optional(),
});

// Security validation
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  // Simple CSRF token validation (implement proper CSRF protection in production)
  return token === sessionToken;
}

export function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin);
}

export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

export function validateImageDimensions(width: number, height: number, maxWidth: number = 2048, maxHeight: number = 2048): boolean {
  return width <= maxWidth && height <= maxHeight;
}

// SQL injection prevention
export function escapeSQL(input: string): string {
  return input.replace(/'/g, "''").replace(/;/g, '');
}

// XSS prevention
export function escapeXSS(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Custom validation errors
export class ValidationError extends Error {
  public fields: Record<string, string[]>;

  constructor(message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

// Validation middleware helper
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (data: unknown): Promise<T> => {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fields: Record<string, string[]> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          if (!fields[path]) {
            fields[path] = [];
          }
          fields[path].push(err.message);
        });
        throw new ValidationError('Validation failed', fields);
      }
      throw error;
    }
  };
}

// Rate limiting validation
export function validateRateLimit(_identifier: string, _maxRequests: number, _windowMs: number): boolean {
  // Implement rate limiting logic here
  // This is a placeholder - in production, use Redis or similar
  return true;
}

// Content Security Policy helpers
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'"],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'media-src': ["'self'"],
  'frame-src': ["'none'"],
};

export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}