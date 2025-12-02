import { prisma } from "./prisma"
import { startOfDay, endOfDay } from "date-fns"

export interface TodayAttendanceStatus {
  hasTimeIn: boolean
  hasTimeOut: boolean
  timeIn: Date | null
  timeOut: Date | null
  totalHours: number | null
}

export async function checkTodayAttendance(userId: string): Promise<TodayAttendanceStatus> {
  const today = new Date()
  const start = startOfDay(today)
  const end = endOfDay(today)

  const attendance = await prisma.attendance.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const timeInRecord = await prisma.attendance.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
      logType: "IN",
    },
  })

  const timeOutRecord = await prisma.attendance.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
      logType: "OUT",
    },
  })

  const timeIn = timeInRecord?.timeIn || null
  const timeOut = timeOutRecord?.timeOut || null

  let totalHours: number | null = null
  if (timeIn && timeOut) {
    totalHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
  }

  return {
    hasTimeIn: !!timeInRecord,
    hasTimeOut: !!timeOutRecord,
    timeIn,
    timeOut,
    totalHours,
  }
}

export async function markTimeIn(userId: string, confidenceScore: number): Promise<void> {
  const today = new Date()
  const start = startOfDay(today)
  const end = endOfDay(today)

  // Check if already timed in today
  const existingTimeIn = await prisma.attendance.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
      logType: "IN",
    },
  })

  if (existingTimeIn) {
    throw new Error("You have already timed in today")
  }

  await prisma.attendance.create({
    data: {
      userId,
      date: today,
      timeIn: new Date(),
      logType: "IN",
      confidenceScore,
    },
  })
}

export async function markTimeOut(userId: string, confidenceScore: number): Promise<void> {
  const today = new Date()
  const start = startOfDay(today)
  const end = endOfDay(today)

  // Check if timed in today
  const timeInRecord = await prisma.attendance.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
      logType: "IN",
    },
  })

  if (!timeInRecord) {
    throw new Error("You must time in before timing out")
  }

  // Check if already timed out today
  const existingTimeOut = await prisma.attendance.findFirst({
    where: {
      userId,
      date: {
        gte: start,
        lte: end,
      },
      logType: "OUT",
    },
  })

  if (existingTimeOut) {
    throw new Error("You have already timed out today")
  }

  await prisma.attendance.create({
    data: {
      userId,
      date: today,
      timeOut: new Date(),
      logType: "OUT",
      confidenceScore,
    },
  })
}

export interface AttendanceFilters {
  userId?: string
  startDate?: Date
  endDate?: Date
  logType?: "IN" | "OUT"
}

export async function getAttendanceLogs(filters: AttendanceFilters = {}) {
  const where: any = {}

  if (filters.userId) {
    where.userId = filters.userId
  }

  if (filters.startDate || filters.endDate) {
    where.date = {}
    if (filters.startDate) {
      where.date.gte = startOfDay(filters.startDate)
    }
    if (filters.endDate) {
      where.date.lte = endOfDay(filters.endDate)
    }
  }

  if (filters.logType) {
    where.logType = filters.logType
  }

  return await prisma.attendance.findMany({
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
      createdAt: "desc",
    },
  })
}

export function calculateHours(timeIn: Date, timeOut: Date): number {
  return (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
}

