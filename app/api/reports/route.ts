import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const exportFormat = searchParams.get('export'); // 'csv' or null

    // Build filters
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startOfDay(new Date(startDate));
      }
      if (endDate) {
        where.date.lte = endOfDay(new Date(endDate));
      }
    }

    // Fetch attendance records
    const attendanceRecords = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Group records by user and date to calculate hours
    const dailyRecords = new Map<string, {
      userId: string;
      userName: string;
      userEmail: string;
      date: Date;
      timeIn: Date | null;
      timeOut: Date | null;
      hours: number | null;
      confidenceScore: number;
    }>();

    attendanceRecords.forEach((record) => {
      const key = `${record.userId}-${format(record.date, 'yyyy-MM-dd')}`;
      const existing = dailyRecords.get(key);

      if (record.logType === 'IN') {
        dailyRecords.set(key, {
          userId: record.userId,
          userName: record.user.name || 'N/A',
          userEmail: record.user.email,
          date: record.date,
          timeIn: record.timeIn,
          timeOut: existing?.timeOut || null,
          hours: null,
          confidenceScore: record.confidenceScore,
        });
      } else if (record.logType === 'OUT') {
        const timeIn = existing?.timeIn || null;
        let hours: number | null = null;
        if (timeIn && record.timeOut) {
          hours = (record.timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
        }
        dailyRecords.set(key, {
          userId: record.userId,
          userName: record.user.name || 'N/A',
          userEmail: record.user.email,
          date: record.date,
          timeIn: timeIn || null,
          timeOut: record.timeOut,
          hours,
          confidenceScore: record.confidenceScore,
        });
      }
    });

    const dailyRecordsArray = Array.from(dailyRecords.values());

    // Calculate summary statistics
    const totalRecords = dailyRecordsArray.length;
    const totalHours = dailyRecordsArray
      .filter((r) => r.hours !== null)
      .reduce((sum, r) => sum + (r.hours || 0), 0);
    const averageHours = totalRecords > 0 ? totalHours / dailyRecordsArray.filter((r) => r.hours !== null).length : 0;
    const uniqueUsers = new Set(dailyRecordsArray.map((r) => r.userId)).size;
    const completeDays = dailyRecordsArray.filter((r) => r.hours !== null).length;
    const incompleteDays = dailyRecordsArray.filter((r) => r.hours === null).length;

    // Calculate average confidence score
    const avgConfidence = attendanceRecords.length > 0
      ? attendanceRecords.reduce((sum, r) => sum + r.confidenceScore, 0) / attendanceRecords.length
      : 0;

    // User-specific statistics
    const userStats = new Map<string, {
      userId: string;
      userName: string;
      userEmail: string;
      totalDays: number;
      totalHours: number;
      averageHours: number;
      completeDays: number;
      incompleteDays: number;
    }>();

    dailyRecordsArray.forEach((record) => {
      const existing = userStats.get(record.userId) || {
        userId: record.userId,
        userName: record.userName,
        userEmail: record.userEmail,
        totalDays: 0,
        totalHours: 0,
        averageHours: 0,
        completeDays: 0,
        incompleteDays: 0,
      };

      existing.totalDays++;
      if (record.hours !== null) {
        existing.totalHours += record.hours;
        existing.completeDays++;
      } else {
        existing.incompleteDays++;
      }
      existing.averageHours = existing.completeDays > 0
        ? existing.totalHours / existing.completeDays
        : 0;

      userStats.set(record.userId, existing);
    });

    const summary = {
      totalRecords,
      totalHours: parseFloat(totalHours.toFixed(2)),
      averageHours: parseFloat(averageHours.toFixed(2)),
      uniqueUsers,
      completeDays,
      incompleteDays,
      averageConfidence: parseFloat((avgConfidence * 100).toFixed(2)),
      userStats: Array.from(userStats.values()),
      dailyRecords: dailyRecordsArray.map((r) => ({
        ...r,
        date: format(r.date, 'yyyy-MM-dd'),
        timeIn: r.timeIn ? format(r.timeIn, 'HH:mm:ss') : null,
        timeOut: r.timeOut ? format(r.timeOut, 'HH:mm:ss') : null,
        hours: r.hours ? parseFloat(r.hours.toFixed(2)) : null,
      })),
    };

    // If export is requested, return CSV
    if (exportFormat === 'csv') {
      const csvRows = [
        ['Date', 'User Name', 'Email', 'Time In', 'Time Out', 'Hours', 'Confidence Score'],
        ...dailyRecordsArray.map((r) => [
          format(r.date, 'yyyy-MM-dd'),
          r.userName,
          r.userEmail,
          r.timeIn ? format(r.timeIn, 'HH:mm:ss') : '',
          r.timeOut ? format(r.timeOut, 'HH:mm:ss') : '',
          r.hours ? r.hours.toFixed(2) : '',
          (r.confidenceScore * 100).toFixed(2) + '%',
        ]),
      ];

      const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
        },
      });
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

