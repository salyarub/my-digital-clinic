import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/axios'
import { toast } from 'sonner'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Users, UserPlus, Power, PowerOff, Shield, Loader2, Trash2, Edit2, Calendar, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react'

const StaffManagementPage = () => {
    const { t, i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const queryClient = useQueryClient()
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingSecretary, setEditingSecretary] = useState(null)
    const [editPermissions, setEditPermissions] = useState([])

    // Form State
    const [formData, setFormData] = useState({
        email: '', password: '', first_name: '', last_name: '', phone: '',
        permissions: ['manage_bookings']
    })

    const { data: secretaries, isLoading, error } = useQuery({
        queryKey: ['secretaries'],
        queryFn: async () => (await api.get('clinic/secretaries/')).data
    })

    const createSecretaryMutation = useMutation({
        mutationFn: async (data) => (await api.post('clinic/secretaries/', data)).data,
        onSuccess: () => {
            toast.success(isRtl ? 'تم إضافة السكرتير بنجاح' : 'Secretary added successfully')
            queryClient.invalidateQueries(['secretaries'])
            setIsAddOpen(false)
            setFormData({ email: '', password: '', first_name: '', last_name: '', phone: '', permissions: ['manage_bookings'] })
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed to create secretary')
    })

    const toggleActiveMutation = useMutation({
        mutationFn: async (id) => (await api.post(`clinic/secretaries/${id}/toggle_active/`)).data,
        onSuccess: (data) => {
            toast.success(isRtl ? `تم ${data.is_active ? 'تفعيل' : 'تعطيل'} الحساب` : `Account ${data.status}`)
            queryClient.invalidateQueries(['secretaries'])
        }
    })

    // Update permissions mutation
    const updatePermissionsMutation = useMutation({
        mutationFn: async ({ id, permissions }) => (await api.patch(`clinic/secretaries/${id}/`, { permissions })).data,
        onSuccess: () => {
            toast.success(isRtl ? 'تم تحديث الصلاحيات بنجاح' : 'Permissions updated successfully')
            queryClient.invalidateQueries(['secretaries'])
            setEditingSecretary(null)
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed to update permissions')
    })

    // Old handler removed - replaced by new logic below

    const getPermissionDetails = (id) => {
        for (const group of PERMISSION_GROUPS) {
            const perm = group.permissions.find(p => p.id === id)
            if (perm) return perm
        }
        return { label: id }
    }

    const handleEditPermissionChange = (permId, dependencies = []) => {
        setEditPermissions(prev => {
            const currentPerms = prev
            let newPerms = [...currentPerms]

            if (currentPerms.includes(permId)) {
                // Uncheck: Remove self AND any permission that depends on this one
                const dependents = PERMISSION_GROUPS.flatMap(g => g.permissions)
                    .filter(p => p.dependencies?.includes(permId))
                    .map(p => p.id)
                newPerms = newPerms.filter(p => p !== permId && !dependents.includes(p))
            } else {
                newPerms = [...new Set([...newPerms, permId, ...dependencies])]
            }
            return newPerms
        })
    }

    const openEditDialog = (secretary) => {
        setEditingSecretary(secretary)
        setEditPermissions(secretary.permissions || [])
    }

    const savePermissions = () => {
        if (editingSecretary) {
            updatePermissionsMutation.mutate({ id: editingSecretary.id, permissions: editPermissions })
        }
    }

    // Defined with dependencies to make logic "more reliable" as requested
    const PERMISSION_GROUPS = [
        {
            title: isRtl ? 'إدارة المواعيد' : 'Schedule Management',
            permissions: [
                { id: 'view_schedule', label: isRtl ? 'عرض الجدول فقط' : 'View Schedule Only', icon: Calendar, description: isRtl ? 'صلاحية أساسية لرؤية التقويم' : 'Basic access to view calendar' },
                { id: 'manage_bookings', label: isRtl ? 'إدارة الحجوزات' : 'Manage Bookings', icon: Edit2, description: isRtl ? 'قبول، رفض، وتعديل المواعيد' : 'Approve, reject, and reschedule', dependencies: ['view_schedule'] },
                { id: 'manage_schedule', label: isRtl ? 'التحكم بالحجز الرقمي' : 'Control Digital Booking', icon: Power, description: isRtl ? 'إيقاف/تشغيل الحجز الأونلاين' : 'Turn online booking on/off', dependencies: ['view_schedule'] },
                { id: 'manage_time_off', label: isRtl ? 'إدارة الإجازات الطارئة' : 'Emergency Time-off', icon: AlertTriangle, description: isRtl ? 'حظر أيام محددة للطوارئ' : 'Block days for emergencies', dependencies: ['view_schedule'] },
            ]
        },
        {
            title: isRtl ? 'شؤون المرضى' : 'Patient Affairs',
            permissions: [
                { id: 'patient_checkin', label: isRtl ? 'تسجيل دخول (Check-in)' : 'Patient Check-in', icon: CheckCircle, description: isRtl ? 'بدء الزيارة عند وصول المريض' : 'Start visit when patient arrives', dependencies: ['view_schedule'] },
                { id: 'add_walkin_patient', label: isRtl ? 'إضافة انتظار (Walk-in)' : 'Add Walk-in', icon: UserPlus, description: isRtl ? 'إضافة مريض بدون حجز مسبق' : 'Add patient without prior booking', dependencies: ['view_schedule'] },
                { id: 'receive_notifications', label: isRtl ? 'استقبال الإشعارات' : 'Receive Notifications', icon: Sparkles, description: isRtl ? 'تنبيهات عند الحجز الجديد' : 'Alerts for new bookings' },
            ]
        },
        {
            title: isRtl ? 'إدارة متقدمة (خطر)' : 'Advanced Admin (Sensitive)',
            permissions: [
                { id: 'edit_doctor_profile', label: isRtl ? 'تعديل ملف الطبيب' : 'Edit Doctor Profile', icon: Shield, description: isRtl ? 'تغيير السعر، الصور، والبيانات' : 'Change price, photos, and info' },
            ]
        }
    ]

    const handlePermissionChange = (permId, dependencies = []) => {
        setFormData(prev => {
            const currentPerms = prev.permissions
            let newPerms = [...currentPerms]

            if (currentPerms.includes(permId)) {
                // Uncheck: Remove self AND any permission that depends on this one
                const dependents = PERMISSION_GROUPS.flatMap(g => g.permissions)
                    .filter(p => p.dependencies?.includes(permId))
                    .map(p => p.id)

                newPerms = newPerms.filter(p => p !== permId && !dependents.includes(p))
            } else {
                // Check: Add self AND dependencies
                newPerms = [...new Set([...newPerms, permId, ...dependencies])]
            }
            return { ...prev, permissions: newPerms }
        })
    }

    // Helper to render permission item
    const PermissionItem = ({ item, selected, onChange }) => (
        <div
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-accent/50'}`}
            onClick={onChange}
        >
            <div className={`mt-0.5 h-5 w-5 rounded border ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'} flex items-center justify-center shrink-0`}>
                {selected && <CheckCircle className="h-3.5 w-3.5" />}
            </div>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 font-medium leading-none">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.description}
                </p>
            </div>
        </div>
    )

    // ... (Wait to render in DialogContent)


    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                            <Users className="h-7 w-7 md:h-8 md:w-8 text-primary" />
                            {isRtl ? 'إدارة طاقم العمل' : 'Staff Management'}
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">
                            {isRtl ? 'إضافة وإدارة حسابات السكرتارية وصلاحياتهم' : 'Add and manage secretary accounts and permissions'}
                        </p>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 w-full sm:w-auto">
                                <UserPlus className="h-4 w-4" />
                                {isRtl ? 'إضافة سكرتير' : 'Add Secretary'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{isRtl ? 'إضافة سكرتير جديد' : 'Add New Secretary'}</DialogTitle>
                                <DialogDescription>{isRtl ? 'أدخل بيانات السكرتير الجديد وحدد صلاحياته' : 'Enter details and permissions for the new staff member'}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>{isRtl ? 'الاسم الأول' : 'First Name'}</Label><Input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} /></div>
                                    <div><Label>{isRtl ? 'الاسم الأخير' : 'Last Name'}</Label><Input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} /></div>
                                </div>
                                <div><Label>{isRtl ? 'البريد الإلكتروني' : 'Email'}</Label><Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                                <div><Label>{isRtl ? 'password' : 'Password'}</Label><Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} /></div>

                                <div className="space-y-4 pt-4">
                                    <Label className="text-base">{isRtl ? 'تحديد الصلاحيات' : 'Select Permissions'}</Label>

                                    <div className="space-y-4 h-[300px] overflow-y-auto pr-2 border rounded-md p-2">
                                        {PERMISSION_GROUPS.map((group, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                                                    {group.title}
                                                    <div className="h-px flex-1 bg-border" />
                                                </h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {group.permissions.map(perm => (
                                                        <PermissionItem
                                                            key={perm.id}
                                                            item={perm}
                                                            selected={formData.permissions.includes(perm.id)}
                                                            onChange={() => handlePermissionChange(perm.id, perm.dependencies || [])}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>{isRtl ? 'إلغاء' : 'Cancel'}</Button>
                                <Button onClick={() => createSecretaryMutation.mutate(formData)} disabled={createSecretaryMutation.isPending}>
                                    {createSecretaryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    {isRtl ? 'حفظ' : 'Save'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{isRtl ? 'قائمة الموظفين' : 'Staff List'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : secretaries?.length === 0 ? (
                            <div className="text-center p-12 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p className="text-lg font-medium">{isRtl ? 'لم يتم إضافة موظفين بعد' : 'No staff members found'}</p>
                                <p className="text-sm mt-1">{isRtl ? 'اضغط "إضافة سكرتير" للبدء' : 'Click "Add Secretary" to get started'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {secretaries.map((sec) => (
                                    <div key={sec.id} className="group relative rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
                                        {/* Status indicator bar */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 ${sec.is_active ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`} />

                                        <div className="p-5 pt-4">
                                            {/* Header: Name + Status + Actions */}
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${sec.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                        {sec.first_name?.[0]}{sec.last_name?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold text-base truncate">{sec.first_name} {sec.last_name}</h3>
                                                        <p className="text-sm text-muted-foreground truncate">{sec.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Badge className={`text-[11px] ${sec.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                                                        {sec.is_active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'معطل' : 'Inactive')}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Permissions */}
                                            <div className="mb-4">
                                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                                                    {isRtl ? 'الصلاحيات' : 'Permissions'} ({sec.permissions.length})
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                                    {sec.permissions.map(p => {
                                                        const details = getPermissionDetails(p)
                                                        return (
                                                            <div key={p} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-[11px]">
                                                                {details.icon && <details.icon className="h-3.5 w-3.5 text-primary shrink-0" />}
                                                                <span className="truncate">{details.label}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-3 border-t border-border/50">
                                                <Button variant="outline" size="sm" onClick={() => openEditDialog(sec)} className="flex-1 gap-2">
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                    {isRtl ? 'تعديل الصلاحيات' : 'Edit Permissions'}
                                                </Button>
                                                <Button
                                                    variant={sec.is_active ? "destructive" : "default"}
                                                    size="sm"
                                                    onClick={() => toggleActiveMutation.mutate(sec.id)}
                                                    disabled={toggleActiveMutation.isPending}
                                                    className="gap-2"
                                                >
                                                    {sec.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                                                    {sec.is_active ? (isRtl ? 'تعطيل' : 'Disable') : (isRtl ? 'تفعيل' : 'Enable')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Permissions Dialog */}
            <Dialog open={!!editingSecretary} onOpenChange={(open) => !open && setEditingSecretary(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isRtl ? 'تعديل صلاحيات السكرتير' : 'Edit Secretary Permissions'}</DialogTitle>
                        <DialogDescription>
                            {isRtl ? `تعديل صلاحيات ${editingSecretary?.first_name} ${editingSecretary?.last_name}` :
                                `Edit permissions for ${editingSecretary?.first_name} ${editingSecretary?.last_name}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <div className="space-y-4 h-[300px] overflow-y-auto pr-2 border rounded-md p-2">
                            {PERMISSION_GROUPS.map((group, idx) => (
                                <div key={idx} className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
                                        {group.title}
                                        <div className="h-px flex-1 bg-border" />
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {group.permissions.map(perm => (
                                            <PermissionItem
                                                key={perm.id}
                                                item={perm}
                                                selected={editPermissions.includes(perm.id)}
                                                onChange={() => handleEditPermissionChange(perm.id, perm.dependencies || [])}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSecretary(null)}>{isRtl ? 'إلغاء' : 'Cancel'}</Button>
                        <Button onClick={savePermissions} disabled={updatePermissionsMutation.isPending}>
                            {updatePermissionsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    )
}

export default StaffManagementPage
