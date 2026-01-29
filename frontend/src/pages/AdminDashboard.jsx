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
    Calendar, Shield, Activity, TrendingUp, RefreshCw
} from 'lucide-react'

const AdminDashboard = () => {
    const { t, i18n } = useTranslation()
    const [pendingDoctors, setPendingDoctors] = useState([])
    const [allDoctors, setAllDoctors] = useState([])
    const [stats, setStats] = useState({
        totalDoctors: 0,
        verifiedDoctors: 0,
        pendingDoctors: 0,
        totalPatients: 0,
        totalBookings: 0,
        todayBookings: 0
    })
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setIsLoading(true)
        try {
            // Fetch pending doctors
            const pendingRes = await api.get('admin/doctors/')
            setPendingDoctors(pendingRes.data)

            // Fetch stats
            try {
                const statsRes = await api.get('admin/stats/')
                setStats(statsRes.data)
            } catch (e) {
                // Stats endpoint might not exist yet, use pending doctors count
                setStats(prev => ({
                    ...prev,
                    pendingDoctors: pendingRes.data.length
                }))
            }
        } catch (error) {
            console.error(error)
            toast.error(t('common.error'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleAction = async (doctorId, action) => {
        try {
            await api.post('admin/doctors/', { doctor_id: doctorId, action })
            toast.success(action === 'approve' ? t('admin.actions.approved') : t('admin.actions.rejected'))
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

    const tabs = [
        { id: 'overview', label: t('admin.tabs.overview'), icon: Activity },
        { id: 'pending', label: t('admin.tabs.pending'), icon: Clock },
        { id: 'doctors', label: t('admin.tabs.doctors'), icon: Stethoscope },
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
                            {tab.id === 'pending' && pendingDoctors.length > 0 && (
                                <Badge variant="destructive" className="ml-1">{pendingDoctors.length}</Badge>
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
                                        value={pendingDoctors.length}
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
                                                <span>{t('admin.quickActions.reviewRequests')} ({pendingDoctors.length})</span>
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
                                {pendingDoctors.length > 0 && (
                                    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                                        <CardHeader>
                                            <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                                                <Clock className="h-5 w-5" />
                                                {t('admin.requests.needsReview')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {pendingDoctors.slice(0, 3).map(doc => (
                                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                                        <div>
                                                            <p className="font-medium">{doc.first_name} {doc.last_name}</p>
                                                            <p className="text-sm text-muted-foreground">{doc.specialty} • {doc.email}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(doc.id, 'approve')}>
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="sm" variant="destructive" onClick={() => handleAction(doc.id, 'reject')}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {pendingDoctors.length > 3 && (
                                                <Button
                                                    variant="link"
                                                    className="mt-4 w-full"
                                                    onClick={() => setActiveTab('pending')}
                                                >
                                                    {t('admin.requests.viewAll')} ({pendingDoctors.length})
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
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-orange-500" />
                                        {t('admin.requests.title')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('admin.requests.pendingCount', { count: pendingDoctors.length })}
                                    </CardDescription>
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
                                                        <TableHead>{t('admin.table.registrationDate')}</TableHead>
                                                        <TableHead>{t('admin.table.license')}</TableHead>
                                                        <TableHead className="text-left">{t('admin.table.actions')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pendingDoctors.map((doc) => (
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
                                                                {new Date(doc.joined_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-IQ' : 'en-US')}
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
                                                                                    src={doc.license_image}
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
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-green-600 hover:bg-green-700 gap-1"
                                                                        onClick={() => handleAction(doc.id, 'approve')}
                                                                    >
                                                                        <Check className="h-4 w-4" /> {t('admin.actions.approve')}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="gap-1"
                                                                        onClick={() => handleAction(doc.id, 'reject')}
                                                                    >
                                                                        <X className="h-4 w-4" /> {t('admin.actions.reject')}
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
                        )}

                        {/* All Doctors Tab */}
                        {activeTab === 'doctors' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Stethoscope className="h-5 w-5" />
                                        {t('admin.doctors.title')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('admin.doctors.subtitle')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Stethoscope className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                        <p className="text-lg">{t('admin.doctors.comingSoon')}</p>
                                        <p className="text-sm">{t('admin.doctors.comingSoonDesc')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </Layout>
    )
}

export default AdminDashboard
