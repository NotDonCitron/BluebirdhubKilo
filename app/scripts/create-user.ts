#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser() {
  const email = 'claracouve342@gmail.com';
  const password = 'Cocodascroco1!12';
  const name = 'Clara Test';

  try {
    console.log('🔍 Checking if user already exists...');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('❌ User already exists with this email:', email);
      console.log('✅ You can login with:');
      console.log('   Email:', email);
      console.log('   Password: [your password]');
      return;
    }

    console.log('✅ Email is available, creating user...');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER'
      }
    });

    console.log('🎉 User created successfully!');
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.name);
    console.log('🆔 User ID:', user.id);
    console.log('🎭 Role:', user.role);
    console.log('');
    console.log('🔑 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('');
    console.log('🌐 You can now login at: https://app-phhttps-projects.vercel.app/login');

  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();