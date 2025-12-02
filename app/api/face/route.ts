import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const getAllFaceEmbeddings = await prisma.faceEmbedding.findMany();
    return NextResponse.json({ embeddings: getAllFaceEmbeddings });
  } catch (error) {
    console.error('Error fetching face:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
