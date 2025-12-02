const { config } = require('dotenv');
const { resolve } = require('path');

// Load environment variables from .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const { PrismaClient, Role, LogType } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Initialize Prisma Client for MongoDB
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password for seeded users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
      image: null,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create Employee Users
  const employee1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: hashedPassword,
      role: Role.EMPLOYEE,
      image: null,
    },
  });
  console.log('✅ Created employee:', employee1.email);

  const employee2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      password: hashedPassword,
      role: Role.EMPLOYEE,
      image: null,
    },
  });
  console.log('✅ Created employee:', employee2.email);

  const employee3 = await prisma.user.upsert({
    where: { email: 'bob.johnson@example.com' },
    update: {},
    create: {
      email: 'bob.johnson@example.com',
      name: 'Bob Johnson',
      password: hashedPassword,
      role: Role.EMPLOYEE,
      image: null,
    },
  });
  console.log('✅ Created employee:', employee3.email);

  // Create sample face embeddings (mock 128D vectors)
  const mockEmbedding = Array.from({ length: 128 }, () => Math.random());

  await prisma.faceEmbedding.upsert({
    where: { userId: employee1.id },
    update: { embeddings: mockEmbedding },
    create: {
      userId: employee1.id,
      embeddings: mockEmbedding,
    },
  });
  console.log('✅ Created face embedding for:', employee1.email);

  await prisma.faceEmbedding.upsert({
    where: { userId: employee2.id },
    update: { embeddings: mockEmbedding },
    create: {
      userId: employee2.id,
      embeddings: mockEmbedding,
    },
  });
  console.log('✅ Created face embedding for:', employee2.email);

  // Create sample attendance records for the past 7 days
  const today = new Date();
  const employees = [employee1, employee2, employee3];

  // Clear existing attendance records for seeded users (optional - comment out if you want to keep existing data)
  await prisma.attendance.deleteMany({
    where: {
      userId: {
        in: employees.map((e) => e.id),
      },
    },
  });
  console.log('🧹 Cleared existing attendance records');

  const attendanceRecords = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0); // Reset to start of day

    for (const employee of employees) {
      // Skip weekends (optional - remove if you want weekend data)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Create time in record
      const timeIn = new Date(date);
      timeIn.setHours(9, Math.floor(Math.random() * 30), 0, 0); // Random time between 9:00-9:30

      attendanceRecords.push({
        userId: employee.id,
        date: date,
        timeIn: timeIn,
        logType: LogType.IN,
        confidenceScore: 0.85 + Math.random() * 0.15, // Random score between 0.85-1.0
      });

      // Create time out record (if not the current day)
      if (i > 0) {
        const timeOut = new Date(date);
        timeOut.setHours(
          17 + Math.floor(Math.random() * 2),
          Math.floor(Math.random() * 60),
          0,
          0
        ); // Random time between 17:00-19:00

        attendanceRecords.push({
          userId: employee.id,
          date: date,
          timeOut: timeOut,
          logType: LogType.OUT,
          confidenceScore: 0.85 + Math.random() * 0.15,
        });
      }
    }
  }

  // Create all attendance records in batch
  // Note: MongoDB doesn't support skipDuplicates, so we'll create them individually
  for (const record of attendanceRecords) {
    await prisma.attendance
      .create({
        data: record,
      })
      .catch(() => {
        // Ignore duplicate errors for MongoDB
      });
  }
  console.log(
    `✅ Created ${attendanceRecords.length} attendance records for the past 7 days`
  );

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
