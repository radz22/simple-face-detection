import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkTodayAttendance } from '@/lib/attendance';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Non-admins can only check their own status
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = await checkTodayAttendance(userId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
