'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileDown,
  Calendar,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportSummary {
  totalRecords: number;
  totalHours: number;
  averageHours: number;
  uniqueUsers: number;
  completeDays: number;
  incompleteDays: number;
  averageConfidence: number;
  userStats: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    totalDays: number;
    totalHours: number;
    averageHours: number;
    completeDays: number;
    incompleteDays: number;
  }>;
  dailyRecords: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    date: string;
    timeIn: string | null;
    timeOut: string | null;
    hours: number | null;
    confidenceScore: number;
  }>;
}

export default function AdminReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [users, setUsers] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
      fetchReport();
    } else {
      router.push('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    fetchReport();
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

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        toast.error('Failed to load report');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('export', 'csv');

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${format(
          new Date(),
          'yyyy-MM-dd'
        )}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report exported successfully');
      } else {
        toast.error('Failed to export report');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Reports</h1>
          <p className="text-muted-foreground">
            Generate summaries and export attendance data
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting || !summary}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter attendance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
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
          </div>

          <Button
            onClick={() =>
              setFilters({
                userId: '',
                startDate: '',
                endDate: '',
              })
            }
            variant="outline"
            className="mt-4"
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Records
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalRecords}</div>
                <p className="text-xs text-muted-foreground">Attendance days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Hours
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(summary.totalHours ?? 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Hours worked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Hours
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(summary.averageHours ?? 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Per day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.uniqueUsers}</div>
                <p className="text-xs text-muted-foreground">Active users</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Complete Days
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.completeDays}</div>
                <p className="text-xs text-muted-foreground">
                  With time in & out
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Incomplete Days
                </CardTitle>
                <XCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.incompleteDays}
                </div>
                <p className="text-xs text-muted-foreground">
                  Missing time out
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Confidence
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.averageConfidence.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Face recognition
                </p>
              </CardContent>
            </Card>
          </div>

          {summary.userStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>User Statistics</CardTitle>
                <CardDescription>
                  Breakdown by user for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Total Days</TableHead>
                      <TableHead>Complete Days</TableHead>
                      <TableHead>Incomplete Days</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Average Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.userStats.map((stat) => (
                      <TableRow key={stat.userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{stat.userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {stat.userEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{stat.totalDays}</TableCell>
                        <TableCell>
                          <Badge variant="default">{stat.completeDays}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {stat.incompleteDays}
                          </Badge>
                        </TableCell>
                        <TableCell>{stat.totalHours.toFixed(2)} hrs</TableCell>
                        <TableCell>
                          {stat.averageHours.toFixed(2)} hrs
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {summary.dailyRecords.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Records</CardTitle>
                <CardDescription>
                  Detailed attendance records for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Confidence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.dailyRecords.map((record, index) => (
                        <TableRow
                          key={`${record.userId}-${record.date}-${index}`}
                        >
                          <TableCell>
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.userName}</p>
                              <p className="text-xs text-muted-foreground">
                                {record.userEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.timeIn || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.timeOut || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.hours !== null ? (
                              <Badge variant="secondary">
                                {record.hours.toFixed(2)} hrs
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.confidenceScore >= 0.7
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {(record.confidenceScore * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
