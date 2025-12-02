import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const faceEmbeddingSchema = z.object({
  embeddings: z.array(z.number()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can upload their own face, admins can upload for any user
    if (session.user.id !== id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validated = faceEmbeddingSchema.parse(body);

    // Validate embedding array length (should be 128 for face-api.js)
    if (validated.embeddings.length !== 128) {
      return NextResponse.json(
        { error: 'Invalid embedding format' },
        { status: 400 }
      );
    }

    // Upsert face embedding
    await prisma.faceEmbedding.upsert({
      where: { userId: id },
      create: {
        userId: id,
        embeddings: validated.embeddings,
      },
      update: {
        embeddings: validated.embeddings,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error processing face:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can view their own embedding, admins can view any
    if (session.user.id !== id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const faceEmbedding = await prisma.faceEmbedding.findUnique({
      where: { userId: id },
      select: {
        embeddings: true,
      },
    });

    if (!faceEmbedding) {
      return NextResponse.json(
        { error: 'Face embedding not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ embeddings: faceEmbedding.embeddings });
  } catch (error) {
    console.error('Error fetching face embedding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
