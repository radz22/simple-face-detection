import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAttendanceLogs } from '@/lib/attendance';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const markAttendanceSchema = z.object({
  userId: z.string(),
  confidenceScore: z.number().min(0).max(1),
  faceEmbedding: z.array(z.number()).optional(), // Optional for backward compatibility
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const logType = searchParams.get('logType') as 'IN' | 'OUT' | null;

    // Non-admins can only view their own logs
    const filters: any = {};
    if (session.user.role !== 'ADMIN') {
      filters.userId = session.user.id;
    } else if (userId) {
      filters.userId = userId;
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    if (logType) {
      filters.logType = logType;
    }

    const logs = await getAttendanceLogs(filters);

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = markAttendanceSchema.parse(body);

    // Users can only mark their own attendance
    if (session.user.id !== validated.userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Server-side face verification if faceEmbedding is provided
    if (validated.faceEmbedding && validated.faceEmbedding.length === 128) {
      try {
        // Fetch stored face embedding
        const faceEmbedding = await prisma.faceEmbedding.findUnique({
          where: { userId: validated.userId },
          select: { embeddings: true },
        });

        if (!faceEmbedding) {
          return NextResponse.json(
            { error: 'No face registered. Please register your face first.' },
            { status: 400 }
          );
        }

        // Import face recognition utilities
        const { arrayToFloat32Array, cosineSimilarity } = await import(
          '@/lib/face-recognition'
        );

        // Convert embeddings to Float32Array
        const capturedEmbedding = arrayToFloat32Array(validated.faceEmbedding);
        const storedEmbedding = arrayToFloat32Array(
          faceEmbedding.embeddings as number[]
        );

        // Calculate similarity
        const similarity = cosineSimilarity(capturedEmbedding, storedEmbedding);

        // Minimum similarity threshold
        const MIN_SIMILARITY_THRESHOLD = 0.6;

        // Verify face match
        if (similarity < MIN_SIMILARITY_THRESHOLD) {
          return NextResponse.json(
            {
              error: `Face verification failed. Similarity: ${(
                similarity * 100
              ).toFixed(1)}%. Minimum required: ${(
                MIN_SIMILARITY_THRESHOLD * 100
              ).toFixed(0)}%.`,
            },
            { status: 403 }
          );
        }

        // Use the actual similarity score instead of provided confidenceScore
        validated.confidenceScore = similarity;
      } catch (error) {
        console.error('Error verifying face:', error);
        return NextResponse.json(
          { error: 'Face verification error' },
          { status: 500 }
        );
      }
    }

    // Import here to avoid circular dependency
    const { checkTodayAttendance, markTimeIn, markTimeOut } = await import(
      '@/lib/attendance'
    );

    const status = await checkTodayAttendance(validated.userId);

    if (!status.hasTimeIn) {
      await markTimeIn(validated.userId, validated.confidenceScore);
      return NextResponse.json({
        success: true,
        action: 'timeIn',
        message: 'Time in recorded successfully',
      });
    } else if (!status.hasTimeOut) {
      await markTimeOut(validated.userId, validated.confidenceScore);
      return NextResponse.json({
        success: true,
        action: 'timeOut',
        message: 'Time out recorded successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Already completed attendance for today' },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error marking attendance:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
