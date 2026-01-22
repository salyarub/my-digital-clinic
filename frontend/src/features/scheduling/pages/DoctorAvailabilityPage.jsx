import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Clock, Save, Loader2, Calendar, Users } from 'lucide-react'

const DAYS = [
    { value: 0, en: 'Sunday', ar: 'الأحد', color: 'from-blue-500 to-cyan-500' },
    { value: 1, en: 'Monday', ar: 'الإثنين', color: 'from-purple-500 to-pink-500' },
    { value: 2, en: 'Tuesday', ar: 'الثلاثاء', color: 'from-green-500 to-emerald-500' },
    { value: 3, en: 'Wednesday', ar: 'الأربعاء', color: 'from-orange-500 to-amber-500' },
    { value: 4, en: 'Thursday', ar: 'الخميس', color: 'from-red-500 to-rose-500' },
    { value: 5, en: 'Friday', ar: 'الجمعة', color: 'from-indigo-500 to-blue-500' },
    { value: 6, en: 'Saturday', ar: 'السبت', color: 'from-teal-500 to-cyan-500' },
]

const DoctorAvailabilityPage = () => {
    const { i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const queryClient = useQueryClient()

    const { data: availabilities, isLoading } = useQuery({
        queryKey: ['doctorAvailability'],
        queryFn: async () => {
            const res = await api.get('scheduling/availability/')
            return res.data
        }
    })

    const [scheduleState, setScheduleState] = useState([])
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        if (availabilities) {
            const newState = DAYS.map(day => {
                const existing = availabilities.find(a => a.day_of_week === day.value)
                if (existing) {
                    return {
                        id: existing.id,
                        day_of_week: day.value,
                        is_available: existing.is_available,
                        start_time: existing.start_time?.slice(0, 5) || '09:00',
                        end_time: existing.end_time?.slice(0, 5) || '17:00',
                        max_patients_per_slot: existing.max_patients_per_slot || 1,
                        slot_duration: existing.slot_duration || 30
                    }
                }
                return {
                    day_of_week: day.value,
                    is_available: false,
                    start_time: '09:00',
                    end_time: '17:00',
                    max_patients_per_slot: 1,
                    slot_duration: 30
                }
            })
            setScheduleState(newState)
        }
    }, [availabilities])

    const saveMutation = useMutation({
        mutationFn: async () => {
            await api.post('scheduling/availability/bulk_update/', {
                availabilities: scheduleState
            })
        },
        onSuccess: () => {
            toast.success(isRtl ? 'تم حفظ جدول الدوام' : 'Schedule saved successfully!')
            queryClient.invalidateQueries(['doctorAvailability'])
            queryClient.invalidateQueries(['doctorProfile'])
            setHasChanges(false)
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to save')
        }
    })

    const updateDay = (dayValue, field, value) => {
        setScheduleState(prev => prev.map(item => {
            if (item.day_of_week === dayValue) {
                return { ...item, [field]: value }
            }
            return item
        }))
        setHasChanges(true)
    }

    const toggleDay = (dayValue) => {
        setScheduleState(prev => prev.map(item => {
            if (item.day_of_week === dayValue) {
                return { ...item, is_available: !item.is_available }
            }
            return item
        }))
        setHasChanges(true)
    }

    if (isLoading) {
        return (
            <Layout>
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 p-8 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-10 w-10" />
                                <h1 className="text-4xl font-bold">
                                    {isRtl ? 'أوقات الدوام' : 'Working Hours'}
                                </h1>
                            </div>
                            <p className="text-blue-100 text-lg">
                                {isRtl ? 'حدد أيام وساعات عملك وعدد المرضى لكل فترة' : 'Set your working days, hours, and patient capacity'}
                            </p>
                        </div>

                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={!hasChanges || saveMutation.isPending}
                            size="lg"
                            className={`gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-lg ${hasChanges ? 'animate-pulse' : ''}`}
                        >
                            {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            <span className="font-semibold">{isRtl ? 'حفظ التغييرات' : 'Save Changes'}</span>
                        </Button>
                    </div>
                </div>

                {/* Days Grid */}
                <div className="grid gap-6">
                    {DAYS.map(day => {
                        const config = scheduleState.find(s => s.day_of_week === day.value) || {}
                        const isActive = config.is_available

                        return (
                            <Card key={day.value} className={`overflow-hidden transition-all duration-300 hover:shadow-xl ${isActive ? 'ring-2 ring-green-400 shadow-lg' : 'opacity-75 hover:opacity-100'}`}>
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Day Header */}
                                        <div className={`relative flex items-center justify-between p-6 md:w-64 bg-gradient-to-br ${day.color} text-white`}>
                                            <div className="absolute inset-0 bg-black/10"></div>
                                            <div className="relative flex items-center gap-4 flex-1">
                                                <div
                                                    onClick={() => toggleDay(day.value)}
                                                    className={`w-16 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 ${isActive ? 'bg-white/30' : 'bg-black/20'}`}
                                                >
                                                    <div className={`h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-300 ${isActive ? 'translate-x-8 rtl:-translate-x-8' : 'translate-x-0'}`} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold">{isRtl ? day.ar : day.en}</h3>
                                                    <p className="text-sm text-white/80">{isActive ? (isRtl ? 'يوم عمل' : 'Working Day') : (isRtl ? 'عطلة' : 'Day Off')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Settings */}
                                        <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                                            {isActive ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                            <Clock className="h-3 w-3" />
                                                            {isRtl ? 'من الساعة' : 'Start Time'}
                                                        </Label>
                                                        <Input
                                                            type="time"
                                                            value={config.start_time}
                                                            onChange={(e) => updateDay(day.value, 'start_time', e.target.value)}
                                                            className="border-2 focus:ring-2 focus:ring-blue-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                            <Clock className="h-3 w-3" />
                                                            {isRtl ? 'إلى الساعة' : 'End Time'}
                                                        </Label>
                                                        <Input
                                                            type="time"
                                                            value={config.end_time}
                                                            onChange={(e) => updateDay(day.value, 'end_time', e.target.value)}
                                                            className="border-2 focus:ring-2 focus:ring-blue-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                                            {isRtl ? 'مدة الجلسة (دقيقة)' : 'Slot Duration (min)'}
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            min="5"
                                                            step="5"
                                                            value={config.slot_duration}
                                                            onChange={(e) => updateDay(day.value, 'slot_duration', parseInt(e.target.value))}
                                                            className="text-center border-2 focus:ring-2 focus:ring-blue-400 font-semibold"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                            <Users className="h-3 w-3" />
                                                            {isRtl ? 'عدد المرضى/جلسة' : 'Patients/Slot'}
                                                        </Label>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={config.max_patients_per_slot || 1}
                                                                onChange={(e) => updateDay(day.value, 'max_patients_per_slot', parseInt(e.target.value))}
                                                                className="text-center border-2 border-green-300 focus:ring-2 focus:ring-green-400 font-bold text-lg text-green-700"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                                                    {isRtl ? 'اضغط على المفتاح لتفعيل هذا اليوم' : 'Toggle the switch to enable this day'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Info Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-blue-900 mb-2">{isRtl ? 'ملاحظة هامة' : 'Important Note'}</h3>
                                <p className="text-sm text-blue-800 leading-relaxed">
                                    {isRtl
                                        ? 'حقل "عدد المرضى/جلسة" يحدد كم مريض يمكنك استقبالهم في كل فترة زمنية. مثلاً: إذا حددت 5 مرضى ومدة الجلسة 30 دقيقة، يمكنك استقبال 5 مرضى كل نصف ساعة.'
                                        : 'The "Patients/Slot" field determines how many patients you can see per time slot. For example: if you set 5 patients with 30-minute slots, you can see 5 patients every half hour.'
                                    }
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default DoctorAvailabilityPage
