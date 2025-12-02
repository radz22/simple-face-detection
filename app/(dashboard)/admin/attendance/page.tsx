'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Filter, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface AttendanceLog {
  id: string;
  userId: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  logType: 'IN' | 'OUT';
  confidenceScore: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export default function AdminAttendancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    logType: '',
  });

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
      fetchLogs();
    } else {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.logType) params.append('logType', filters.logType);

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance logs');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateHours = (
    timeIn: string | null,
    timeOut: string | null
  ): number | null => {
    if (!timeIn || !timeOut) return null;
    const inTime = new Date(timeIn).getTime();
    const outTime = new Date(timeOut).getTime();
    return (outTime - inTime) / (1000 * 60 * 60);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Logs</h1>
        <p className="text-muted-foreground">
          View and filter all attendance records
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="user">User</Label>
              <Select
                value={filters.userId || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    userId: value === 'all' ? '' : value,
                  })
                }
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logType">Type</Label>
              <Select
                value={filters.logType || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    logType: value === 'all' ? '' : value,
                  })
                }
              >
                <SelectTrigger id="logType">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="IN">Time In</SelectItem>
                  <SelectItem value="OUT">Time Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() =>
              setFilters({
                userId: '',
                startDate: '',
                endDate: '',
                logType: '',
              })
            }
            variant="outline"
            className="mt-4"
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance Records
          </CardTitle>
          <CardDescription>
            {logs.length} record{logs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const hours = calculateHours(log.timeIn, log.timeOut);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={log.user.image || undefined} />
                            <AvatarFallback>
                              {log.user.name?.charAt(0).toUpperCase() ||
                                log.user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {log.user.name || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {log.timeIn
                          ? format(new Date(log.timeIn), 'HH:mm:ss')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {log.timeOut
                          ? format(new Date(log.timeOut), 'HH:mm:ss')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {hours !== null ? (
                          <Badge variant="secondary">
                            {hours.toFixed(2)} hrs
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.confidenceScore >= 0.7 ? 'default' : 'secondary'
                          }
                        >
                          {(log.confidenceScore * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.logType === 'IN' ? 'default' : 'secondary'
                          }
                        >
                          {log.logType}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
