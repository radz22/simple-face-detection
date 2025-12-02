'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FaceCamera } from '@/components/face-camera';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  findBestMatch,
  float32ArrayToArray,
  arrayToFloat32Array,
  cosineSimilarity,
} from '@/lib/face-recognition';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TodayStatus {
  hasTimeIn: boolean;
  hasTimeOut: boolean;
  timeIn: string | null;
  timeOut: string | null;
  totalHours: number | null;
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/attendance/check');
      if (res.ok) {
        const data = await res.json();
        setStatus({
          ...data,
          timeIn: data.timeIn ? new Date(data.timeIn).toISOString() : null,
          timeOut: data.timeOut ? new Date(data.timeOut).toISOString() : null,
        });
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const handleCapture = async (embedding: Float32Array) => {
    if (!session?.user?.id) {
      toast.error('Please log in to mark attendance');
      return;
    }

    setIsProcessing(true);

    try {
      // Check if user has registered face
      const currentUserRes = await fetch(`/api/users/${session.user.id}`);
      if (!currentUserRes.ok) {
        throw new Error('Failed to fetch user data');
      }

      const currentUser = await currentUserRes.json();

      if (!currentUser.faceEmbedding) {
        toast.error(
          'No face registered. Please register your face in your profile first.'
        );
        setIsProcessing(false);
        return;
      }

      // Get stored embedding from database
      const faceEmbeddingRes = await fetch(
        `/api/users/${session.user.id}/face`
      );
      if (!faceEmbeddingRes.ok) {
        throw new Error('Failed to fetch face embedding');
      }

      const faceData = await faceEmbeddingRes.json();
      if (!faceData.embeddings || !Array.isArray(faceData.embeddings)) {
        throw new Error('Invalid face embedding data');
      }

      // Convert stored embedding array to Float32Array
      const storedEmbedding = arrayToFloat32Array(faceData.embeddings);

      // Calculate cosine similarity between captured and stored embeddings
      const similarity = cosineSimilarity(embedding, storedEmbedding);

      // Minimum similarity threshold (matching MIN_SIMILARITY_THRESHOLD)
      const MIN_SIMILARITY_THRESHOLD = 0.6;

      // Verify face match
      if (similarity < MIN_SIMILARITY_THRESHOLD) {
        toast.error(
          `Face verification failed. Similarity: ${(similarity * 100).toFixed(
            1
          )}%. Minimum required: ${(MIN_SIMILARITY_THRESHOLD * 100).toFixed(
            0
          )}%. Please ensure you are the registered user.`
        );
        setIsProcessing(false);
        return;
      }

      // Use the actual similarity score as confidenceScore
      const confidenceScore = similarity;

      // Mark attendance with verified similarity score
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          confidenceScore,
          faceEmbedding: float32ArrayToArray(embedding), // Send for server-side verification
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.action === 'timeIn') {
          toast.success('Time in recorded successfully!');
        } else {
          toast.success('Time out recorded successfully!');
        }
        fetchStatus();
      } else {
        toast.error(data.error || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to mark attendance'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const canMarkAttendance = !status?.hasTimeOut;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mark Attendance</h1>
        <p className="text-muted-foreground">
          Use facial recognition to mark your attendance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <FaceCamera
            onCapture={handleCapture}
            disabled={!canMarkAttendance || isProcessing}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today&apos;s Status
              </CardTitle>
              <CardDescription>
                Your attendance record for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Time In:</span>
                  {status?.hasTimeIn ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {status.timeIn
                        ? format(new Date(status.timeIn), 'HH:mm:ss')
                        : 'N/A'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not recorded
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Time Out:</span>
                  {status?.hasTimeOut ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {status.timeOut
                        ? format(new Date(status.timeOut), 'HH:mm:ss')
                        : 'N/A'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>

                {status &&
                  status.totalHours !== null &&
                  status.totalHours > 0 && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Total Hours:
                        </span>
                        <span className="text-lg font-bold">
                          {status.totalHours.toFixed(2)} hrs
                        </span>
                      </div>
                    </div>
                  )}

                {!canMarkAttendance && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      You have already completed attendance for today.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
