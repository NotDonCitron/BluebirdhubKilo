
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await prisma.fileComment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskAISuggestion.deleteMany();
  await prisma.fileTag.deleteMany();
  await prisma.fileAIMetadata.deleteMany();
  await prisma.file.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user and other users
  const hashedPassword = await bcrypt.hash('johndoe123', 12);
  const hashedPassword2 = await bcrypt.hash('password123', 12);

  const demoUser = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
      role: 'ADMIN',
      image: 'https://i.pinimg.com/originals/57/d2/f9/57d2f9890f97e8867a45f205ef52add2.jpg',
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice@company.com',
      name: 'Alice Johnson',
      password: hashedPassword2,
      role: 'USER',
      image: 'https://cdn.pixabay.com/photo/2024/05/20/13/28/ai-generated-8775232_1280.png',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@company.com',
      name: 'Bob Smith',
      password: hashedPassword2,
      role: 'USER',
      image: 'https://thumbs.dreamstime.com/b/image-features-professional-man-portrait-vector-illustration-showcasing-modern-design-style-clear-minimalistic-356569564.jpg',
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@company.com',
      name: 'Sarah Wilson',
      password: hashedPassword2,
      role: 'USER',
      image: 'https://img.freepik.com/premium-photo/businesswoman-portrait-entrepreneur-woman-manager-with-business-chart-background_691560-8074.jpg',
    },
  });

  console.log('✅ Users created');

  // Create workspaces
  const workspace1 = await prisma.workspace.create({
    data: {
      name: 'Product Development',
      description: 'Main workspace for product development and planning',
      color: '#3B82F6',
      icon: '🚀',
      ownerId: demoUser.id,
    },
  });

  const workspace2 = await prisma.workspace.create({
    data: {
      name: 'Marketing Campaign',
      description: 'Q4 marketing campaigns and content planning',
      color: '#10B981',
      icon: '📈',
      ownerId: alice.id,
    },
  });

  const workspace3 = await prisma.workspace.create({
    data: {
      name: 'Research & Analytics',
      description: 'Data analysis and market research projects',
      color: '#8B5CF6',
      icon: '📊',
      ownerId: demoUser.id,
    },
  });

  console.log('✅ Workspaces created');

  // Add workspace members
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace1.id, userId: alice.id, role: 'ADMIN' },
      { workspaceId: workspace1.id, userId: bob.id, role: 'MEMBER' },
      { workspaceId: workspace1.id, userId: sarah.id, role: 'MEMBER' },
      { workspaceId: workspace2.id, userId: demoUser.id, role: 'ADMIN' },
      { workspaceId: workspace2.id, userId: bob.id, role: 'MEMBER' },
      { workspaceId: workspace3.id, userId: alice.id, role: 'MEMBER' },
      { workspaceId: workspace3.id, userId: sarah.id, role: 'ADMIN' },
    ],
  });

  console.log('✅ Workspace members added');

  // Create folders
  const docsFolder = await prisma.folder.create({
    data: {
      name: 'Documents',
      workspaceId: workspace1.id,
    },
  });

  const designFolder = await prisma.folder.create({
    data: {
      name: 'Design Assets',
      workspaceId: workspace1.id,
    },
  });

  const reportsFolder = await prisma.folder.create({
    data: {
      name: 'Reports',
      workspaceId: workspace3.id,
    },
  });

  console.log('✅ Folders created');

  // Create tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Design new user onboarding flow',
      description: 'Create wireframes and prototypes for the new user onboarding experience. Focus on reducing friction and improving conversion rates.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      workspaceId: workspace1.id,
      createdById: demoUser.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Implement AI file categorization',
      description: 'Develop and integrate AI-powered automatic file categorization system using machine learning models.',
      status: 'TODO',
      priority: 'URGENT',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      workspaceId: workspace1.id,
      createdById: alice.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Q4 Marketing Strategy Document',
      description: 'Prepare comprehensive marketing strategy document for Q4 including budget allocation, target demographics, and campaign timelines.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      workspaceId: workspace2.id,
      createdById: alice.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'User behavior analytics setup',
      description: 'Configure analytics tracking for user behavior patterns and create automated reporting dashboards.',
      status: 'TODO',
      priority: 'LOW',
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      workspaceId: workspace3.id,
      createdById: sarah.id,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: 'Performance optimization review',
      description: 'Conduct comprehensive performance audit and implement optimization strategies for better load times.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      workspaceId: workspace1.id,
      createdById: bob.id,
    },
  });

  console.log('✅ Tasks created');

  // Create task assignments
  await prisma.taskAssignment.createMany({
    data: [
      { taskId: task1.id, userId: alice.id },
      { taskId: task1.id, userId: bob.id },
      { taskId: task2.id, userId: demoUser.id },
      { taskId: task2.id, userId: sarah.id },
      { taskId: task3.id, userId: alice.id },
      { taskId: task4.id, userId: sarah.id },
      { taskId: task4.id, userId: demoUser.id },
      { taskId: task5.id, userId: bob.id },
    ],
  });

  console.log('✅ Task assignments created');

  // Create files
  const file1 = await prisma.file.create({
    data: {
      name: 'project-requirements.pdf',
      originalName: 'Project Requirements Document.pdf',
      mimeType: 'application/pdf',
              size: 2048576, // 2MB
      url: 'https://static.vecteezy.com/system/resources/thumbnails/022/086/609/small_2x/file-type-icons-format-and-extension-of-documents-pdf-icon-free-vector.jpg',
      workspaceId: workspace1.id,
      folderId: docsFolder.id,
      uploadedById: demoUser.id,
    },
  });

  const file2 = await prisma.file.create({
    data: {
      name: 'ui-mockups.figma',
      originalName: 'UI Mockups v2.figma',
      mimeType: 'application/figma',
              size: 8392704, // 8MB
      url: 'https://i.pinimg.com/736x/f5/38/ed/f538ed90eb4dba513af4576f47eea418.jpg',
      workspaceId: workspace1.id,
      folderId: designFolder.id,
      uploadedById: alice.id,
    },
  });

  const file3 = await prisma.file.create({
    data: {
      name: 'user-analytics-report.xlsx',
      originalName: 'User Analytics Q3 Report.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              size: 1536000, // 1.5MB
      url: 'https://cdn0.iconfinder.com/data/icons/investors-skills-5/496/spreadsheets-analysis-data-table-chart-1024.png',
      workspaceId: workspace3.id,
      folderId: reportsFolder.id,
      uploadedById: sarah.id,
    },
  });

  const file4 = await prisma.file.create({
    data: {
      name: 'brand-guidelines.pdf',
      originalName: 'Brand Guidelines 2024.pdf',
      mimeType: 'application/pdf',
              size: 5242880, // 5MB
      url: 'https://static.vecteezy.com/system/resources/previews/021/709/193/original/brand-guidelines-icon-vector.jpg',
      workspaceId: workspace2.id,
      uploadedById: alice.id,
    },
  });

  const file5 = await prisma.file.create({
    data: {
      name: 'api-documentation.md',
      originalName: 'API Documentation.md',
      mimeType: 'text/markdown',
              size: 524288, // 512KB
      url: 'https://static.vecteezy.com/system/resources/previews/020/361/247/original/document-icon-set-technical-documentation-illustration-sign-collection-manual-symbol-vector.jpg',
      workspaceId: workspace1.id,
      folderId: docsFolder.id,
      uploadedById: bob.id,
    },
  });

  console.log('✅ Files created');

  // Create AI metadata for files
  await prisma.fileAIMetadata.createMany({
    data: [
      {
        fileId: file1.id,
        category: 'Documentation',
        subcategory: 'Requirements',
        summary: 'Comprehensive project requirements document outlining functional and non-functional specifications for the new productivity application.',
                    keywords: JSON.stringify(['requirements', 'specifications', 'project', 'documentation', 'features']),
        confidence: 0.95,
        extractedText: 'Project Requirements Document\n\n1. Functional Requirements\n- User authentication and authorization\n- Workspace management\n- Task tracking and assignment\n- File management with AI categorization\n\n2. Non-functional Requirements\n- Performance: Load times under 2 seconds\n- Scalability: Support 10,000+ concurrent users\n- Security: End-to-end encryption for sensitive data',
      },
      {
        fileId: file2.id,
        category: 'Design',
        subcategory: 'UI/UX',
        summary: 'User interface mockups and wireframes for the new application design system including dark mode and responsive layouts.',
                    keywords: JSON.stringify(['ui', 'mockups', 'design', 'wireframes', 'figma', 'responsive']),
        confidence: 0.88,
      },
      {
        fileId: file3.id,
        category: 'Analytics',
        subcategory: 'Reports',
        summary: 'Quarterly user analytics report showing engagement metrics, user behavior patterns, and conversion rates.',
                    keywords: JSON.stringify(['analytics', 'metrics', 'engagement', 'conversion', 'behavior', 'quarterly']),
        confidence: 0.92,
        extractedText: 'Q3 User Analytics Report\n\nKey Metrics:\n- Monthly Active Users: 15,234\n- Average Session Duration: 12.5 minutes\n- Conversion Rate: 3.2%\n- User Retention (30-day): 68%\n- Feature Adoption Rate: 45%',
      },
      {
        fileId: file4.id,
        category: 'Marketing',
        subcategory: 'Branding',
        summary: 'Complete brand guidelines including logo usage, color palette, typography, and visual identity standards.',
                    keywords: JSON.stringify(['brand', 'guidelines', 'logo', 'colors', 'typography', 'identity']),
        confidence: 0.90,
      },
      {
        fileId: file5.id,
        category: 'Technical',
        subcategory: 'Documentation',
        summary: 'Technical API documentation with endpoints, authentication methods, and integration examples.',
                    keywords: JSON.stringify(['api', 'documentation', 'endpoints', 'technical', 'integration', 'authentication']),
        confidence: 0.94,
        extractedText: 'API Documentation\n\n## Authentication\nAll API requests require authentication using Bearer tokens.\n\n## Endpoints\n- GET /api/workspaces - List all workspaces\n- POST /api/tasks - Create new task\n- PUT /api/files/{id} - Update file metadata\n\n## Rate Limiting\n1000 requests per hour per user',
      },
    ],
  });

  console.log('✅ AI metadata created');

  // Create file tags
  await prisma.fileTag.createMany({
    data: [
      { fileId: file1.id, tag: 'important', color: '#EF4444' },
      { fileId: file1.id, tag: 'project-planning', color: '#3B82F6' },
      { fileId: file2.id, tag: 'design', color: '#8B5CF6' },
      { fileId: file2.id, tag: 'ui-ux', color: '#06B6D4' },
      { fileId: file3.id, tag: 'analytics', color: '#10B981' },
      { fileId: file3.id, tag: 'quarterly', color: '#F59E0B' },
      { fileId: file4.id, tag: 'branding', color: '#EC4899' },
      { fileId: file4.id, tag: 'guidelines', color: '#6366F1' },
      { fileId: file5.id, tag: 'technical', color: '#84CC16' },
      { fileId: file5.id, tag: 'documentation', color: '#64748B' },
    ],
  });

  console.log('✅ File tags created');

  // Create task comments
  await prisma.taskComment.createMany({
    data: [
      {
        content: 'I\'ve started working on the wireframes. Should have the first draft ready by tomorrow.',
        taskId: task1.id,
        userId: alice.id,
      },
      {
        content: 'Looks great! Can we also include mobile responsiveness in the design?',
        taskId: task1.id,
        userId: demoUser.id,
      },
      {
        content: 'I\'ve researched several ML models for file categorization. TensorFlow seems like the best option.',
        taskId: task2.id,
        userId: sarah.id,
      },
      {
        content: 'The performance audit revealed some bottlenecks in the database queries. Working on optimizing them.',
        taskId: task5.id,
        userId: bob.id,
      },
    ],
  });

  console.log('✅ Task comments created');

  // Create file comments
  await prisma.fileComment.createMany({
    data: [
      {
        content: 'This requirements document is very comprehensive. Great work!',
        fileId: file1.id,
        userId: alice.id,
      },
      {
        content: 'The UI mockups look fantastic. The color scheme is very modern.',
        fileId: file2.id,
        userId: demoUser.id,
      },
      {
        content: 'These analytics show great user engagement. We should focus on improving conversion rates.',
        fileId: file3.id,
        userId: demoUser.id,
      },
    ],
  });

  console.log('✅ File comments created');

  // Create AI suggestions for tasks
  await prisma.taskAISuggestion.createMany({
    data: [
      {
        taskId: task1.id,
        suggestion: 'Consider adding user feedback collection during the onboarding process to gather insights for future improvements.',
        type: 'improvement',
        confidence: 0.85,
      },
      {
        taskId: task2.id,
        suggestion: 'Based on current progress, this task might benefit from being broken down into smaller subtasks for better tracking.',
        type: 'completion',
        confidence: 0.78,
      },
      {
        taskId: task4.id,
        suggestion: 'This task could be prioritized higher as analytics setup is crucial for data-driven decision making.',
        type: 'priority',
        confidence: 0.82,
      },
      {
        taskId: task5.id,
        suggestion: 'Consider implementing caching strategies to improve performance. Redis could be a good solution.',
        type: 'improvement',
        confidence: 0.88,
      },
    ],
  });

  console.log('✅ AI suggestions created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Seeded data summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Workspaces: ${await prisma.workspace.count()}`);
  console.log(`- Tasks: ${await prisma.task.count()}`);
  console.log(`- Files: ${await prisma.file.count()}`);
  console.log(`- Task Assignments: ${await prisma.taskAssignment.count()}`);
  console.log(`- Comments: ${await prisma.taskComment.count() + await prisma.fileComment.count()}`);
  console.log('\n🔑 Demo Account:');
  console.log('Email: john@doe.com');
  console.log('Password: johndoe123');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
