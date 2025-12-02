'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface TodayStatus {
  hasTimeIn: boolean;
  hasTimeOut: boolean;
  timeIn: string | null;
  timeOut: string | null;
  totalHours: number | null;
}

interface AdminStats {
  totalUsers: number;
  totalEmployees: number;
  todayAttendance: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      if (session.user.role === 'ADMIN') {
        fetchAdminStats();
      } else {
        fetchStatus();
      }
    }
  }, [session]);

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
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      // Fetch users
      const usersRes = await fetch('/api/users');
      const users = usersRes.ok ? await usersRes.json() : [];

      // Fetch today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const attendanceRes = await fetch(
        `/api/attendance?startDate=${today.toISOString()}&endDate=${tomorrow.toISOString()}`
      );
      const attendanceLogs = attendanceRes.ok ? await attendanceRes.json() : [];

      // Count unique users who checked in today
      const uniqueUsersToday = new Set(
        attendanceLogs
          .filter((log: any) => log.logType === 'IN')
          .map((log: any) => log.userId)
      ).size;

      setAdminStats({
        totalUsers: users.length,
        totalEmployees: users.filter((u: any) => u.role === 'EMPLOYEE').length,
        todayAttendance: uniqueUsersToday,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {session?.user?.role === 'ADMIN' && adminStats && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Total Users
                </CardTitle>
                <CardDescription>All registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {adminStats.totalUsers}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {adminStats.totalEmployees} employees
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Today&apos;s Attendance
                </CardTitle>
                <CardDescription>Users who checked in today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {adminStats.todayAttendance}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  out of {adminStats.totalEmployees} employees
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Manage your system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/admin/users">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      asChild
                    >
                      <span>
                        Manage Users
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  </Link>
                  <Link href="/admin/attendance">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      asChild
                    >
                      <span>
                        View All Attendance
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {session?.user?.role !== 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today&apos;s Status
              </CardTitle>
              <CardDescription>Your attendance for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Time In:</span>
                  {status?.hasTimeIn ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {status.timeIn
                        ? format(new Date(status.timeIn), 'HH:mm')
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
                  <span className="text-sm">Time Out:</span>
                  {status?.hasTimeOut ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {status.timeOut
                        ? format(new Date(status.timeOut), 'HH:mm')
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
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Total Hours:</span>
                      <span className="text-sm font-bold">
                        {status.totalHours.toFixed(2)} hrs
                      </span>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {session?.user?.role !== 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a
                  href="/attendance"
                  className="block w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                >
                  Mark Attendance
                </a>
                <a
                  href="/profile"
                  className="block w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                >
                  Update Profile
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
