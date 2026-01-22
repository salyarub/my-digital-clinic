import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format, parseISO, formatDistanceToNow, subDays, subWeeks, subMonths, isAfter } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/axios'
import {
    Activity, Loader2, Calendar, User, Clock,
    UserPlus, UserCog, CalendarPlus, CalendarX,
    CalendarCheck, RefreshCw, Filter
} from 'lucide-react'

const ActivityLogPage = () => {
    const { t, i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const [timeFilter, setTimeFilter] = useState('all')

    const { data: logs, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['activity-logs'],
        queryFn: async () => (await api.get('clinic/activity-logs/')).data,
        refetchInterval: 10000
    })

    // Filter logs based on time period
    const filteredLogs = useMemo(() => {
        if (!logs || timeFilter === 'all') return logs

        const now = new Date()
        let cutoffDate

        switch (timeFilter) {
            case 'day':
                cutoffDate = subDays(now, 1)
                break
            case '3days':
                cutoffDate = subDays(now, 3)
                break
            case 'week':
                cutoffDate = subWeeks(now, 1)
                break
            case 'month':
                cutoffDate = subMonths(now, 1)
                break
            default:
                return logs
        }

        return logs.filter(log => {
            try {
                return isAfter(parseISO(log.created_at), cutoffDate)
            } catch {
                return true
            }
        })
    }, [logs, timeFilter])

    const timeFilterOptions = [
        { value: 'all', label: isRtl ? 'كل النشاطات' : 'All Activities' },
        { value: 'day', label: isRtl ? 'آخر يوم' : 'Last Day' },
        { value: '3days', label: isRtl ? 'آخر 3 أيام' : 'Last 3 Days' },
        { value: 'week', label: isRtl ? 'آخر أسبوع' : 'Last Week' },
        { value: 'month', label: isRtl ? 'آخر شهر' : 'Last Month' },
    ]

    const getActionConfig = (type) => {
        const configs = {
            'BOOKING_CREATED': {
                icon: CalendarPlus,
                color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                iconColor: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                label: isRtl ? 'حجز جديد' : 'New Booking'
            },
            'BOOKING_APPROVED': {
                icon: CalendarCheck,
                color: 'bg-green-100 text-green-700 border-green-200',
                iconColor: 'text-green-600',
                bgColor: 'bg-green-50',
                label: isRtl ? 'قبول الحجز' : 'Booking Approved'
            },
            'BOOKING_REJECTED': {
                icon: CalendarX,
                color: 'bg-red-100 text-red-700 border-red-200',
                iconColor: 'text-red-600',
                bgColor: 'bg-red-50',
                label: isRtl ? 'رفض الحجز' : 'Booking Rejected'
            },
            'BOOKING_CANCELLED': {
                icon: CalendarX,
                color: 'bg-orange-100 text-orange-700 border-orange-200',
                iconColor: 'text-orange-600',
                bgColor: 'bg-orange-50',
                label: isRtl ? 'إلغاء الحجز' : 'Booking Cancelled'
            },
            'EXAM_STARTED': {
                icon: Activity,
                color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
                iconColor: 'text-cyan-600',
                bgColor: 'bg-cyan-50',
                label: isRtl ? 'بدء الفحص' : 'Exam Started'
            },
            'EXAM_COMPLETED': {
                icon: CalendarCheck,
                color: 'bg-teal-100 text-teal-700 border-teal-200',
                iconColor: 'text-teal-600',
                bgColor: 'bg-teal-50',
                label: isRtl ? 'اكتمال الفحص' : 'Exam Completed'
            },
            'SECRETARY_ADDED': {
                icon: UserPlus,
                color: 'bg-blue-100 text-blue-700 border-blue-200',
                iconColor: 'text-blue-600',
                bgColor: 'bg-blue-50',
                label: isRtl ? 'إضافة موظف' : 'Staff Added'
            },
            'SECRETARY_UPDATED': {
                icon: UserCog,
                color: 'bg-purple-100 text-purple-700 border-purple-200',
                iconColor: 'text-purple-600',
                bgColor: 'bg-purple-50',
                label: isRtl ? 'تحديث موظف' : 'Staff Updated'
            },
        }
        return configs[type] || {
            icon: Activity,
            color: 'bg-gray-100 text-gray-700 border-gray-200',
            iconColor: 'text-gray-600',
            bgColor: 'bg-gray-50',
            label: type.replace(/_/g, ' ')
        }
    }

    const getRoleBadge = (role) => {
        const roles = {
            'DOCTOR': { label: isRtl ? 'طبيب' : 'Doctor', color: 'bg-indigo-100 text-indigo-700' },
            'SECRETARY': { label: isRtl ? 'سكرتير' : 'Secretary', color: 'bg-cyan-100 text-cyan-700' },
            'PATIENT': { label: isRtl ? 'مريض' : 'Patient', color: 'bg-teal-100 text-teal-700' },
            'SYSTEM': { label: isRtl ? 'النظام' : 'System', color: 'bg-gray-100 text-gray-700' },
        }
        return roles[role] || { label: role, color: 'bg-gray-100 text-gray-700' }
    }

    const formatTimeAgo = (dateStr) => {
        try {
            return formatDistanceToNow(parseISO(dateStr), {
                addSuffix: true,
                locale: isRtl ? ar : enUS
            })
        } catch {
            return ''
        }
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            <Activity className="h-8 w-8 text-primary" />
                            {isRtl ? 'سجل النشاطات' : 'Activity Log'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {isRtl ? 'مراقبة كافة الإجراءات التي تتم في العيادة' : 'Monitor all actions performed in your clinic'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Time Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <select
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                            >
                                {timeFilterOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                            {isRtl ? 'تحديث' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                {filteredLogs && filteredLogs.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                        <Activity className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{filteredLogs.length}</p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400">{isRtl ? 'إجمالي النشاطات' : 'Total Activities'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-lg">
                                        <CalendarPlus className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                                            {filteredLogs.filter(l => l.action_type.includes('BOOKING')).length}
                                        </p>
                                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{isRtl ? 'نشاطات الحجوزات' : 'Booking Activities'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500 rounded-lg">
                                        <UserCog className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                            {filteredLogs.filter(l => l.action_type.includes('SECRETARY')).length}
                                        </p>
                                        <p className="text-sm text-purple-600 dark:text-purple-400">{isRtl ? 'نشاطات الموظفين' : 'Staff Activities'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Activity List */}
                <Card>
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                {isRtl ? 'آخر النشاطات' : 'Recent Activities'}
                            </CardTitle>
                            {filteredLogs && logs && filteredLogs.length !== logs.length && (
                                <Badge variant="secondary">
                                    {isRtl
                                        ? `عرض ${filteredLogs.length} من ${logs.length}`
                                        : `Showing ${filteredLogs.length} of ${logs.length}`
                                    }
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-16 gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-muted-foreground">{isRtl ? 'جار التحميل...' : 'Loading...'}</p>
                            </div>
                        ) : error ? (
                            <div className="text-center p-16">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                                    <Activity className="h-8 w-8 text-red-500" />
                                </div>
                                <p className="font-semibold text-red-600">{isRtl ? 'خطأ في تحميل البيانات' : 'Error loading data'}</p>
                                <p className="text-sm text-muted-foreground mt-2">{error?.message || (isRtl ? 'الرجاء المحاولة مرة أخرى' : 'Please try again')}</p>
                                <button
                                    onClick={() => refetch()}
                                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    {isRtl ? 'إعادة المحاولة' : 'Try Again'}
                                </button>
                            </div>
                        ) : !filteredLogs || filteredLogs.length === 0 ? (
                            <div className="text-center p-16">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                    <Activity className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="font-semibold text-muted-foreground">
                                    {timeFilter !== 'all'
                                        ? (isRtl ? 'لا توجد نشاطات في هذه الفترة' : 'No activities in this period')
                                        : (isRtl ? 'لا توجد نشاطات مسجلة' : 'No activities recorded')
                                    }
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {timeFilter !== 'all'
                                        ? (isRtl ? 'جرب اختيار فترة أطول' : 'Try selecting a longer period')
                                        : (isRtl ? 'ستظهر النشاطات هنا عند قيامك بأي إجراء' : 'Activities will appear here when you perform any action')
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredLogs.map((log, index) => {
                                    const config = getActionConfig(log.action_type)
                                    const roleBadge = getRoleBadge(log.actor_role)
                                    const ActionIcon = config.icon

                                    return (
                                        <div
                                            key={log.id}
                                            className={`p-4 hover:bg-muted/30 transition-colors ${index === 0 ? 'bg-primary/5' : ''}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Icon */}
                                                <div className={`p-3 rounded-xl ${config.bgColor} shrink-0`}>
                                                    <ActionIcon className={`h-5 w-5 ${config.iconColor}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        {/* Action Badge */}
                                                        <Badge variant="outline" className={`${config.color} font-medium`}>
                                                            {config.label}
                                                        </Badge>

                                                        {/* Time Ago */}
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatTimeAgo(log.created_at)}
                                                        </span>
                                                    </div>

                                                    {/* Description */}
                                                    <p className="text-sm text-foreground mb-2">
                                                        {log.description}
                                                    </p>

                                                    {/* Actor Info */}
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-full">
                                                            <User className="h-3 w-3 text-muted-foreground" />
                                                            <span className="font-medium">{log.actor_name || (isRtl ? 'غير معروف' : 'Unknown')}</span>
                                                        </div>
                                                        <Badge variant="secondary" className={`${roleBadge.color} text-xs px-2`}>
                                                            {roleBadge.label}
                                                        </Badge>
                                                    </div>

                                                    {/* Mobile Date/Time - Visible only on mobile */}
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 sm:hidden">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(parseISO(log.created_at), 'MMM dd')}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {format(parseISO(log.created_at), 'p')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Date/Time */}
                                                <div className="text-left shrink-0 hidden sm:block">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        <span>{format(parseISO(log.created_at), 'MMM dd, yyyy')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{format(parseISO(log.created_at), 'hh:mm a')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout >
    )
}

export default ActivityLogPage
