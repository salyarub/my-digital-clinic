import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import api from '@/lib/axios'
import { toast } from 'sonner'
import {
    Check, X, Eye, Users, Stethoscope, UserCheck, Clock,
    Calendar, Shield, Activity, TrendingUp, RefreshCw, Server, Plus, Trash, Bell, CheckCircle2, Search
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const AdminDashboard = () => {
    const { t, i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const [pendingDoctors, setPendingDoctors] = useState([])
    const [allDoctors, setAllDoctors] = useState([])
    const [allPatients, setAllPatients] = useState([])
    const [stats, setStats] = useState({
        totalDoctors: 0,
        verifiedDoctors: 0,
        pendingDoctors: 0,
        totalPatients: 0,
        totalBookings: 0,
        todayBookings: 0,
        registrationHistory: []
    })
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')

    // SMTP Settings
    const [smtpSettings, setSmtpSettings] = useState([])
    const [isSmtpLoading, setIsSmtpLoading] = useState(false)
    const [newSmtp, setNewSmtp] = useState({
        host: 'smtp.gmail.com', port: 587, email_host_user: '', email_host_password: '', use_tls: true, is_active: true
    })

    // Rejection state
    const [rejectingDoctorId, setRejectingDoctorId] = useState(null)
    const [rejectionReason, setRejectionReason] = useState('')

    // Search state for doctors, pending doctors and patients
    const [doctorSearchQuery, setDoctorSearchQuery] = useState('')
    const [pendingSearchQuery, setPendingSearchQuery] = useState('')
    const [patientSearchQuery, setPatientSearchQuery] = useState('')

    useEffect(() => {
        fetchData()
        if (activeTab === 'api') {
            fetchSmtpSettings()
        }
    }, [activeTab])

    const fetchSmtpSettings = async () => {
        setIsSmtpLoading(true)
        try {
            const res = await api.get('clinic/smtp-settings/')
            setSmtpSettings(res.data)
        } catch (error) {
            console.error(error)
            toast.error('فشل في جلب إعدادات SMTP')
        } finally {
            setIsSmtpLoading(false)
        }
    }

    const handleAddSmtp = async (e) => {
        e.preventDefault()
        try {
            await api.post('clinic/smtp-settings/', newSmtp)
            toast.success('تمت إضافة الإعدادات بنجاح')
            setNewSmtp({ ...newSmtp, email_host_user: '', email_host_password: '' })
            fetchSmtpSettings()
        } catch (error) {
            console.error(error)
            toast.error('حدث خطأ أثناء الإضافة')
        }
    }

    const handleToggleSmtpActive = async (id, currentStatus) => {
        try {
            await api.patch(`clinic/smtp-settings/${id}/`, { is_active: !currentStatus })
            toast.success('تم تحديث حالة التفعيل')
            fetchSmtpSettings()
        } catch (error) {
            toast.error('حدث خطأ أثناء التحديث')
        }
    }

    const handleDeleteSmtp = async (id) => {
        try {
            await api.delete(`clinic/smtp-settings/${id}/`)
            toast.success('تم الحذف بنجاح')
            fetchSmtpSettings()
        } catch (error) {
            toast.error('حدث خطأ أثناء الحذف')
        }
    }

    const fetchData = async () => {
        setIsLoading(true)
        try {
            // Fetch doctors
            const doctorsRes = await api.get('admin/doctors/')
            setAllDoctors(doctorsRes.data)
            setPendingDoctors(doctorsRes.data.filter(d => !d.is_verified))

            // Fetch patients
            const patientsRes = await api.get('admin/patients/')
            setAllPatients(patientsRes.data)

            // Fetch stats
            try {
                const statsRes = await api.get('admin/stats/')
                setStats(statsRes.data)
            } catch (e) {
                // Stats endpoint might not exist yet, use pending doctors count
                setStats(prev => ({
                    ...prev,
                    pendingDoctors: doctorsRes.data.filter(d => !d.is_verified && d.verification_status !== 'REJECTED').length
                }))
            }
        } catch (error) {
            console.error(error)
            toast.error(t('common.error'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleAction = async (doctorId, action, extraData = {}) => {
        try {
            await api.post('admin/doctors/', { doctor_id: doctorId, action, ...extraData })
            if (action === 'activate' || action === 'approve') {
                toast.success(t('admin.actions.activated'))
            } else if (action === 'deactivate') {
                toast.success(t('admin.actions.deactivated'))
            } else if (action === 'ban') {
                toast.success(isRtl ? 'تم حظر الحساب بنجاح' : 'Account banned successfully')
            } else if (action === 'unban') {
                toast.success(isRtl ? 'تم رفع الحظر بنجاح' : 'Account unbanned successfully')
            } else {
                toast.success(t('admin.actions.rejected'))
            }
            fetchData()
        } catch (error) {
            console.error(error)
            toast.error(t('admin.actions.failed'))
        }
    }

    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) {
            toast.error(isRtl ? 'يرجى كتابة سبب الرفض' : 'Please provide a rejection reason')
            return
        }

        try {
            await api.post('admin/doctors/', {
                doctor_id: rejectingDoctorId,
                action: 'reject',
                rejection_reason: rejectionReason
            })
            toast.success(isRtl ? 'تم رفض الوثيقة' : 'Document rejected')
            setRejectingDoctorId(null)
            setRejectionReason('')
            fetchData()
        } catch (error) {
            console.error(error)
            toast.error(t('admin.actions.failed'))
        }
    }

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <Card className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10`}></div>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <h3 className="text-3xl font-bold mt-1">{value}</h3>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                    <div className={`p-3 rounded-full bg-gradient-to-br ${color}`}>
                        <Icon className="h-6 w-6 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )

    const handlePatientAction = async (patientId, action, extraData = {}) => {
        try {
            await api.post('admin/patients/', { patient_id: patientId, action, ...extraData })
            if (action === 'ban') {
                toast.success(isRtl ? 'تم حظر المريض بنجاح' : 'Patient banned successfully')
            } else if (action === 'unban') {
                toast.success(isRtl ? 'تم رفع الحظر بنجاح' : 'Patient unbanned successfully')
            } else {
                toast.success(isRtl ? 'تم تحديث حالة المريض بنجاح' : 'Patient status updated successfully')
            }
            fetchData()
        } catch (error) {
            console.error(error)
            toast.error(isRtl ? 'فشل في تحديث حالة المريض' : 'Failed to update patient status')
        }
    }

    const tabs = [
        { id: 'overview', label: t('admin.tabs.overview'), icon: Activity },
        { id: 'doctors', label: t('admin.tabs.doctors'), icon: Stethoscope },
        { id: 'patients', label: isRtl ? 'المرضى' : 'Patients', icon: Users },
        { id: 'pending', label: t('admin.tabs.pending'), icon: Clock },
        { id: 'api', label: isRtl ? 'إعدادات API للـ SMTP' : 'SMTP API Settings', icon: Server },
    ]

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            {t('admin.title')}
                        </h1>
                        <p className="text-muted-foreground">{t('admin.subtitle')}</p>
                    </div>
                    <Button onClick={fetchData} variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        {t('admin.refresh')}
                    </Button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex gap-2 border-b pb-2 overflow-x-auto">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? 'default' : 'ghost'}
                            onClick={() => setActiveTab(tab.id)}
                            className="gap-2 whitespace-nowrap"
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            {tab.id === 'pending' && pendingDoctors.filter(d => !d.is_verified).length > 0 && (
                                <Badge variant="destructive" className="ml-1">{pendingDoctors.filter(d => !d.is_verified).length}</Badge>
                            )}
                        </Button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        title={t('admin.stats.pending')}
                                        value={pendingDoctors.filter(d => !d.is_verified).length}
                                        icon={Clock}
                                        color="from-orange-500 to-amber-500"
                                        subtitle={t('admin.stats.pendingSubtitle')}
                                    />
                                    <StatCard
                                        title={t('admin.stats.verifiedDoctors')}
                                        value={stats.verifiedDoctors || 0}
                                        icon={UserCheck}
                                        color="from-green-500 to-emerald-500"
                                    />
                                    <StatCard
                                        title={t('admin.stats.totalPatients')}
                                        value={stats.totalPatients || 0}
                                        icon={Users}
                                        color="from-blue-500 to-cyan-500"
                                    />
                                    <StatCard
                                        title={t('admin.stats.todayBookings')}
                                        value={stats.todayBookings || 0}
                                        icon={Calendar}
                                        color="from-purple-500 to-pink-500"
                                    />
                                </div>

                                {/* Registration History Chart */}
                                {stats.registrationHistory && stats.registrationHistory.length > 0 && (
                                    <Card className="col-span-1 md:col-span-full border-blue-100 bg-white dark:bg-gray-900 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-lg text-blue-700 dark:text-blue-400">
                                                <Activity className="h-5 w-5" />
                                                {isRtl ? 'إحصائيات التسجيل (آخر 30 يوم)' : 'Registration History (Last 30 Days)'}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={stats.registrationHistory} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                                                        cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                    />
                                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '20px' }} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="patients"
                                                        name={isRtl ? 'المرضى' : 'Patients'}
                                                        stroke="#3b82f6"
                                                        strokeWidth={4}
                                                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#2563eb' }}
                                                        animationDuration={1500}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="doctors"
                                                        name={isRtl ? 'الأطباء' : 'Doctors'}
                                                        stroke="#10b981"
                                                        strokeWidth={4}
                                                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#059669' }}
                                                        animationDuration={1500}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Quick Actions */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            {t('admin.quickActions.title')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Button
                                                variant="outline"
                                                className="h-20 flex-col gap-2"
                                                onClick={() => setActiveTab('pending')}
                                            >
                                                <Clock className="h-6 w-6" />
                                                <span>{t('admin.quickActions.reviewRequests')} ({pendingDoctors.filter(d => !d.is_verified).length})</span>
                                            </Button>
                                            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => setActiveTab('doctors')}>
                                                <Stethoscope className="h-6 w-6" />
                                                <span>{t('admin.quickActions.manageDoctors')}</span>
                                            </Button>
                                            <Button variant="outline" className="h-20 flex-col gap-2">
                                                <TrendingUp className="h-6 w-6" />
                                                <span>{t('admin.quickActions.reports')}</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Recent Pending Requests Preview */}
                                {pendingDoctors.filter(d => !d.is_verified).length > 0 && (
                                    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                                        <CardHeader>
                                            <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                                <Clock className="h-5 w-5" />
                                                {t('admin.requests.needsReview')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {pendingDoctors.filter(d => !d.is_verified).slice(0, 3).map(doc => (
                                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                                        <div>
                                                            <p className="font-medium">{doc.first_name} {doc.last_name}</p>
                                                            <p className="text-sm text-muted-foreground">{doc.specialty} • {doc.email}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(doc.id, 'activate')}>
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {pendingDoctors.filter(d => !d.is_verified).length > 3 && (
                                                <Button
                                                    variant="link"
                                                    className="mt-4 w-full"
                                                    onClick={() => setActiveTab('pending')}
                                                >
                                                    {t('admin.requests.viewAll')} ({pendingDoctors.filter(d => !d.is_verified).length})
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Pending Doctors Tab */}
                        {activeTab === 'pending' && (
                            <Card>
                                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-orange-500" />
                                            {t('admin.requests.title')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('admin.requests.pendingCount', { count: pendingDoctors.filter(d => !d.is_verified).length })}
                                        </CardDescription>
                                    </div>
                                    <div className="relative w-full md:w-64">
                                        <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                                        <Input
                                            type="text"
                                            placeholder={isRtl ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                                            value={pendingSearchQuery}
                                            onChange={(e) => setPendingSearchQuery(e.target.value)}
                                            className={`${isRtl ? 'pr-9' : 'pl-9'} w-full`}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {pendingDoctors.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <UserCheck className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                            <p className="text-lg">{t('admin.requests.noPending')}</p>
                                            <p className="text-sm">{t('admin.requests.allReviewed')}</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('admin.table.name')}</TableHead>
                                                        <TableHead>{t('admin.table.email')}</TableHead>
                                                        <TableHead>{t('admin.table.gender')}</TableHead>
                                                        <TableHead>{t('admin.table.specialty')}</TableHead>
                                                        <TableHead>{t('admin.table.status')}</TableHead>
                                                        <TableHead>{t('admin.table.registrationDate')}</TableHead>
                                                        <TableHead>{t('admin.table.license')}</TableHead>
                                                        <TableHead className="text-left">{t('admin.table.actions')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pendingDoctors
                                                        .filter(doc => {
                                                            const query = pendingSearchQuery.toLowerCase()
                                                            const fullName = `${doc.first_name} ${doc.last_name}`.toLowerCase()
                                                            return fullName.includes(query) || doc.email.toLowerCase().includes(query)
                                                        })
                                                        .map((doc) => (
                                                            <TableRow key={doc.id}>
                                                                <TableCell className="font-medium">
                                                                    {doc.first_name} {doc.last_name}
                                                                </TableCell>
                                                                <TableCell>{doc.email}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">
                                                                        {doc.gender === 'M' ? t('admin.table.male') : t('admin.table.female')}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge>{doc.specialty}</Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={doc.is_verified ? "default" : "secondary"} className={doc.is_verified ? "bg-green-600" : doc.verification_status === 'REJECTED' ? "bg-red-500 text-white" : "bg-orange-500 text-white"}>
                                                                        {doc.is_verified ? t('admin.table.active') : doc.verification_status === 'REJECTED' ? (isRtl ? 'مرفوض' : 'Rejected') : t('admin.table.inactive')}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {doc.joined_at ? new Date(doc.joined_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-IQ' : 'en-US') : '-'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {doc.license_image ? (
                                                                        <Dialog>
                                                                            <DialogTrigger asChild>
                                                                                <Button variant="ghost" size="sm" className="gap-2">
                                                                                    <Eye className="h-4 w-4" /> {t('admin.table.view')}
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
                                                                                <DialogHeader>
                                                                                    <DialogTitle>{t('admin.table.licenseTitle')}</DialogTitle>
                                                                                </DialogHeader>
                                                                                <div className="flex justify-center p-4">
                                                                                    <img
                                                                                        src={doc.license_image?.startsWith('http') ? doc.license_image : `http://${window.location.hostname}:8000${doc.license_image}`}
                                                                                        alt="License"
                                                                                        className="max-w-full h-auto rounded-lg border"
                                                                                    />
                                                                                </div>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-sm">{t('admin.table.noLicense')}</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex gap-2">
                                                                        {doc.is_verified ? (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="gap-1 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                                                                                onClick={() => handleAction(doc.id, 'deactivate')}
                                                                            >
                                                                                <X className="h-4 w-4" /> {t('admin.actions.deactivate')}
                                                                            </Button>
                                                                        ) : doc.verification_status === 'REJECTED' ? (
                                                                            <>
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="bg-green-600 hover:bg-green-700 gap-1"
                                                                                    onClick={() => handleAction(doc.id, 'activate')}
                                                                                >
                                                                                    <Check className="h-4 w-4" /> {t('admin.actions.activate')}
                                                                                </Button>
                                                                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 self-center">
                                                                                    {isRtl ? 'مرفوض سابقاً' : 'Previously Rejected'}
                                                                                </Badge>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="bg-green-600 hover:bg-green-700 gap-1"
                                                                                    onClick={() => handleAction(doc.id, 'activate')}
                                                                                >
                                                                                    <Check className="h-4 w-4" /> {t('admin.actions.activate')}
                                                                                </Button>

                                                                                {doc.verification_status !== 'REJECTED' && (
                                                                                    <Dialog
                                                                                        open={rejectingDoctorId === doc.id}
                                                                                        onOpenChange={(open) => {
                                                                                            if (open) {
                                                                                                setRejectingDoctorId(doc.id)
                                                                                                setRejectionReason('')
                                                                                            } else {
                                                                                                setRejectingDoctorId(null)
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        <DialogTrigger asChild>
                                                                                            <Button size="sm" variant="destructive" className="gap-1">
                                                                                                <X className="h-4 w-4" /> {isRtl ? 'رفض' : 'Reject'}
                                                                                            </Button>
                                                                                        </DialogTrigger>
                                                                                        <DialogContent>
                                                                                            <DialogHeader>
                                                                                                <DialogTitle>{isRtl ? 'رفض وثيقة الطبيب' : 'Reject Doctor Document'}</DialogTitle>
                                                                                                <p className="text-sm text-muted-foreground">
                                                                                                    {isRtl ? 'يرجى إدخال سبب الرفض ليتمكن الطبيب من معرفة المشكلة وإصلاحها.' : 'Please enter a rejection reason so the doctor can fix the issue.'}
                                                                                                </p>
                                                                                            </DialogHeader>
                                                                                            <div className="space-y-4 py-4">
                                                                                                <div className="space-y-2">
                                                                                                    <label className="text-sm font-medium">{isRtl ? 'سبب الرفض' : 'Rejection Reason'}</label>
                                                                                                    <Input
                                                                                                        value={rejectionReason}
                                                                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                                                                        placeholder={isRtl ? 'مثال: الصورة غير واضحة، الوثيقة منتهية الصلاحية...' : 'e.g. Image blurry, Document expired...'}
                                                                                                    />
                                                                                                </div>
                                                                                                <Button className="w-full" variant="destructive" onClick={handleRejectSubmit}>
                                                                                                    {isRtl ? 'تأكيد الرفض' : 'Confirm Rejection'}
                                                                                                </Button>
                                                                                            </div>
                                                                                        </DialogContent>
                                                                                    </Dialog>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* All Doctors Tab */}
                        {
                            activeTab === 'doctors' && (
                                <Card>
                                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Stethoscope className="h-5 w-5 text-blue-500" />
                                                {t('admin.doctors.title')}
                                            </CardTitle>
                                            <CardDescription>
                                                {isRtl ? `إجمالي الأطباء: ${allDoctors.filter(d => d.verification_status !== 'REJECTED' && !(d.verification_status === 'PENDING' && !d.is_verified)).length}` : `Total Doctors: ${allDoctors.filter(d => d.verification_status !== 'REJECTED' && !(d.verification_status === 'PENDING' && !d.is_verified)).length}`}
                                            </CardDescription>
                                        </div>
                                        <div className="relative w-full md:w-64">
                                            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                                            <Input
                                                type="text"
                                                placeholder={isRtl ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                                                value={doctorSearchQuery}
                                                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                                                className={`${isRtl ? 'pr-9' : 'pl-9'} w-full`}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.name')}</TableHead>
                                                        <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.email')}</TableHead>
                                                        <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.specialty')}</TableHead>
                                                        <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.registrationDate')}</TableHead>
                                                        <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.status')}</TableHead>
                                                        <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.actions')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {allDoctors
                                                        .filter(doc => doc.verification_status !== 'REJECTED' && !(doc.verification_status === 'PENDING' && !doc.is_verified)) // Show all except rejected and unverified-pending (those are in the Pending tab)
                                                        .filter(doc => {
                                                            const query = doctorSearchQuery.toLowerCase()
                                                            const fullName = `${doc.first_name} ${doc.last_name}`.toLowerCase()
                                                            return fullName.includes(query) || doc.email.toLowerCase().includes(query)
                                                        })
                                                        .map((doc) => (
                                                            <TableRow key={doc.id}>
                                                                <TableCell className="font-medium">
                                                                    {doc.first_name} {doc.last_name}
                                                                </TableCell>
                                                                <TableCell>{doc.email}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{doc.specialty}</Badge>
                                                                </TableCell>
                                                                <TableCell>{new Date(doc.joined_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-1">
                                                                        {doc.is_banned ? (
                                                                            <Badge variant="destructive">
                                                                                {isRtl ? 'محظور' : 'Banned'}
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge variant={doc.is_verified ? "outline" : "destructive"} className={doc.is_verified ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                                                {doc.is_verified ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'معطل' : 'Disabled')}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant={doc.is_verified ? "outline" : "default"}
                                                                            className={doc.is_verified ? "text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" : "bg-green-600 hover:bg-green-700"}
                                                                            onClick={() => handleAction(doc.id, doc.is_verified ? 'deactivate' : 'activate')}
                                                                        >
                                                                            {doc.is_verified ? (
                                                                                <>
                                                                                    <X className="h-4 w-4 mr-1" />
                                                                                    {isRtl ? 'تعطيل' : 'Disable'}
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Check className="h-4 w-4 mr-1" />
                                                                                    {isRtl ? 'تفعيل' : 'Enable'}
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                        {doc.is_banned ? (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                                                onClick={() => handleAction(doc.id, 'unban')}
                                                                            >
                                                                                {isRtl ? 'رفع الحظر' : 'Unban'}
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="destructive"
                                                                                onClick={() => handleAction(doc.id, 'ban')}
                                                                            >
                                                                                {isRtl ? 'حظر' : 'Ban'}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        }
                        {/* Patients Tab */}
                        {activeTab === 'patients' && (
                            <Card>
                                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-500" />
                                            {isRtl ? 'إدارة المرضى' : 'Manage Patients'}
                                        </CardTitle>
                                        <CardDescription>
                                            {isRtl ? `إجمالي المرضى: ${allPatients.length}` : `Total Patients: ${allPatients.length}`}
                                        </CardDescription>
                                    </div>
                                    <div className="relative w-full md:w-64">
                                        <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                                        <Input
                                            type="text"
                                            placeholder={isRtl ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
                                            value={patientSearchQuery}
                                            onChange={(e) => setPatientSearchQuery(e.target.value)}
                                            className={`${isRtl ? 'pr-9' : 'pl-9'} w-full`}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className={isRtl ? "text-right" : ""}>{isRtl ? 'الاسم' : 'Name'}</TableHead>
                                                    <TableHead className={isRtl ? "text-right" : ""}>{isRtl ? 'البريد الإلكتروني' : 'Email'}</TableHead>
                                                    <TableHead className={isRtl ? "text-right" : ""}>{isRtl ? 'الجنس' : 'Gender'}</TableHead>
                                                    <TableHead className={isRtl ? "text-right" : ""}>{isRtl ? 'تاريخ التسجيل' : 'Date Joined'}</TableHead>
                                                    <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.status')}</TableHead>
                                                    <TableHead className={isRtl ? "text-right" : ""}>{t('admin.table.actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {allPatients
                                                    .filter(pat => {
                                                        const query = patientSearchQuery.toLowerCase()
                                                        const fullName = `${pat.first_name} ${pat.last_name}`.toLowerCase()
                                                        return fullName.includes(query) || pat.email.toLowerCase().includes(query)
                                                    })
                                                    .map((pat) => (
                                                        <TableRow key={pat.id}>
                                                            <TableCell className="font-medium">
                                                                {pat.first_name} {pat.last_name}
                                                            </TableCell>
                                                            <TableCell>{pat.email}</TableCell>
                                                            <TableCell>{pat.gender === 'M' ? (isRtl ? 'ذكر' : 'Male') : pat.gender === 'F' ? (isRtl ? 'أنثى' : 'Female') : (isRtl ? 'غير محدد' : 'Unknown')}</TableCell>
                                                            <TableCell>{new Date(pat.joined_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    {pat.is_banned ? (
                                                                        <Badge variant="destructive">
                                                                            {isRtl ? 'محظور' : 'Banned'}
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant={pat.is_active ? "outline" : "destructive"} className={pat.is_active ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                                            {pat.is_active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'معطل' : 'Disabled')}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant={pat.is_active ? "outline" : "default"}
                                                                        className={pat.is_active ? "text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" : "bg-green-600 hover:bg-green-700"}
                                                                        onClick={() => handlePatientAction(pat.id, pat.is_active ? 'deactivate' : 'activate')}
                                                                    >
                                                                        {pat.is_active ? (
                                                                            <>
                                                                                <X className="h-4 w-4 mr-1" />
                                                                                {isRtl ? 'تعطيل' : 'Disable'}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Check className="h-4 w-4 mr-1" />
                                                                                {isRtl ? 'تفعيل' : 'Enable'}
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                    {pat.is_banned ? (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                                                            onClick={() => handlePatientAction(pat.id, 'unban')}
                                                                        >
                                                                            {isRtl ? 'رفع الحظر' : 'Unban'}
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="destructive"
                                                                            onClick={() => handlePatientAction(pat.id, 'ban')}
                                                                        >
                                                                            {isRtl ? 'حظر' : 'Ban'}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* API SMTP Tab */}
                        {
                            activeTab === 'api' && (
                                <div className="space-y-6">
                                    <Card className="overflow-hidden border-0 shadow-lg bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
                                        <CardHeader className="relative border-b border-border/50 bg-white/40 dark:bg-gray-900/40 pb-6 px-6 sm:px-8">
                                            <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-inner">
                                                    <Server className="h-6 w-6" />
                                                </div>
                                                إعدادات خوادم البريد (SMTP)
                                            </CardTitle>
                                            <CardDescription className="text-base mt-2">
                                                أضف حسابات بريد إلكتروني (مثل Gmail App Passwords) لإرسال التنبيهات ورسائل التفعيل للمستخدمين. ملاحظة: حساب واحد فقط يمكن أن يكون نشطاً في نفس الوقت.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-6 sm:p-8 relative space-y-8">
                                            <form onSubmit={handleAddSmtp} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                                <div className="space-y-2 relative">
                                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">البريد الإلكتروني (Gmail)</label>
                                                    <Input
                                                        type="email"
                                                        placeholder="example@gmail.com"
                                                        value={newSmtp.email_host_user}
                                                        onChange={(e) => setNewSmtp({ ...newSmtp, email_host_user: e.target.value })}
                                                        required
                                                        className="h-12 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/50 transition-all rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">كلمة مرور التطبيق (App Password)</label>
                                                    <Input
                                                        type="text"
                                                        placeholder="16-character code"
                                                        value={newSmtp.email_host_password}
                                                        onChange={(e) => setNewSmtp({ ...newSmtp, email_host_password: e.target.value })}
                                                        required
                                                        className="h-12 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/50 transition-all rounded-xl font-mono text-sm tracking-widest"
                                                    />
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">الخادم</label>
                                                    <Input
                                                        type="text"
                                                        value={newSmtp.host}
                                                        onChange={(e) => setNewSmtp({ ...newSmtp, host: e.target.value })}
                                                        required
                                                        className="h-12 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/50 transition-all rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">المنفذ</label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        dir="ltr"
                                                        className="h-12 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/50 transition-all rounded-xl rtl:text-right text-left"
                                                        value={newSmtp.port}
                                                        onChange={(e) => {
                                                            let val = e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, '');
                                                            setNewSmtp({ ...newSmtp, port: val })
                                                        }}
                                                        required
                                                    />
                                                </div>
                                                <div className="md:col-span-2 pt-4 relative">
                                                    <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 gap-2">
                                                        <Plus className="h-5 w-5" /> إضافة إعداد خادم جديد
                                                    </Button>
                                                </div>
                                            </form>

                                            {isSmtpLoading ? (
                                                <div className="flex justify-center py-12">
                                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                                </div>
                                            ) : smtpSettings.length === 0 ? (
                                                <div className="text-center py-16 px-4 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                                    <Server className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">لا توجد إعدادات محفوظة</h3>
                                                    <p className="text-gray-500 dark:text-gray-400">قم بإضافة إعدادات خادم بريد جديد لتمكين إرسال الرسائل.</p>
                                                </div>
                                            ) : (
                                                <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-950 shadow-sm">
                                                    <Table>
                                                        <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                                            <TableRow className="hover:bg-transparent border-0">
                                                                <TableHead className="py-4 font-semibold text-right">البريد الإلكتروني</TableHead>
                                                                <TableHead className="py-4 font-semibold text-right">الخادم والمنفذ</TableHead>
                                                                <TableHead className="py-4 font-semibold text-right">الحالة</TableHead>
                                                                <TableHead className="py-4 font-semibold text-left rtl:text-left">الإجراءات</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {smtpSettings.map((setting, idx) => (
                                                                <TableRow key={setting.id} className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-900/50 ${idx !== smtpSettings.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : 'border-0'} ${setting.is_active ? "bg-green-50/30 dark:bg-green-900/10" : ""}`}>
                                                                    <TableCell className="font-medium py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                                                {setting.email_host_user.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            {setting.email_host_user}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="py-4 text-gray-500 dark:text-gray-400">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium text-gray-700 dark:text-gray-300">{setting.host}</span>
                                                                            <span className="text-xs flex items-center gap-1 opacity-80 mt-1"><Server className="h-3 w-3" /> بورت {setting.port}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="py-4">
                                                                        <Badge variant={setting.is_active ? "default" : "secondary"} className={`px-3 py-1 rounded-full font-medium ${setting.is_active ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 hover:bg-green-500/20 shadow-sm" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                                                                            {setting.is_active ? (
                                                                                <span className="flex items-center gap-1.5 focus:outline-none">
                                                                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                                                    نشط حالياً
                                                                                </span>
                                                                            ) : "غير مفعّل"}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="py-4">
                                                                        <div className="flex justify-start gap-2 rtl:justify-end">
                                                                            <Button
                                                                                size="sm"
                                                                                variant={setting.is_active ? "outline" : "secondary"}
                                                                                className={`h-9 font-medium transition-colors ${setting.is_active ? "text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-900/50 dark:hover:bg-orange-900/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"}`}
                                                                                onClick={() => handleToggleSmtpActive(setting.id, setting.is_active)}
                                                                            >
                                                                                {setting.is_active ? "إيقاف التفعيل" : "تفعيل كخادم رئيسي"}
                                                                            </Button>
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg"
                                                                                onClick={() => handleDeleteSmtp(setting.id)}
                                                                            >
                                                                                <Trash className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )
                        }
                    </>
                )}
            </div >
        </Layout >
    )
}

export default AdminDashboard
