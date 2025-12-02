'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { FaceCamera } from '@/components/face-camera';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, CheckCircle2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { float32ArrayToArray } from '@/lib/face-recognition';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  faceEmbedding: {
    id: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(`/api/users/${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
        setName(data.name || '');
        setEmail(data.email || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session, fetchUserData]);

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${session.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
        }),
      });

      if (res.ok) {
        toast.success('Profile updated successfully');
        await update();
        fetchUserData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your profile and face registration
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <Avatar className="h-16 w-16">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>
                  {session?.user?.name?.charAt(0).toUpperCase() ||
                    session?.user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{session?.user?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {session?.user?.email}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {session?.user?.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Face Registration
            </CardTitle>
            <CardDescription>
              Register or update your face for attendance recognition
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userData?.faceEmbedding ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-500">
                      Face registered
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last updated:{' '}
                      {new Date(
                        userData.faceEmbedding.updatedAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the camera below to update your face registration.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <p className="text-sm text-yellow-500">
                  No face registered. Please use the camera to register your
                  face for attendance.
                </p>
              </div>
            )}

            <div className="mt-4">
              <FaceCameraComponent
                userId={session?.user?.id || ''}
                onSuccess={fetchUserData}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FaceCameraComponent({
  userId,
  onSuccess,
}: {
  userId: string;
  onSuccess: () => void;
}) {
  const handleFaceCapture = async (embedding: Float32Array) => {
    try {
      // Convert Float32Array to number array
      const embeddingArray = float32ArrayToArray(embedding);

      // Send embedding to server
      const res = await fetch(`/api/users/${userId}/face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeddings: embeddingArray }),
      });

      if (res.ok) {
        toast.success('Face registered successfully!');
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to register face');
      }
    } catch {
      toast.error('Failed to register face');
    }
  };

  return <FaceCamera onCapture={handleFaceCapture} />;
}
