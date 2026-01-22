import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import confetti from 'canvas-confetti'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Stethoscope, Clock, CheckCircle, ArrowLeft, UserPlus, RefreshCw, Loader2, MapPin, Building, Facebook, Instagram, Twitter, Youtube, Video, Users, Trash2, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import MapPicker from '@/components/ui/MapPicker'

const DoctorBookingPage = () => {
    const { doctorId } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { t, i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [bookingType, setBookingType] = useState('NEW')
    const [numberOfPeople, setNumberOfPeople] = useState(1)
    const [bookingSuccess, setBookingSuccess] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)

    // Fetch doctor details
    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: ['doctor', doctorId],
        queryFn: async () => {
            const res = await api.get(`doctors/${doctorId}/`)
            return res.data
        }
    })

    // Fetch available slots from API
    // Fetch available slots from API - Real-time data, no cache
    const { data: slotsData, isLoading: slotsLoading } = useQuery({
        queryKey: ['doctorSlots', doctorId],
        queryFn: async () => {
            const res = await api.get(`doctors/${doctorId}/slots/`)
            return res.data
        },
        staleTime: 0, // Always fetch fresh data for slots
        refetchOnWindowFocus: true // Update when user comes back to tab
    })

    // Check if patient already has an active booking with this doctor
    const { data: myBookings } = useQuery({
        queryKey: ['myBookingsWithDoctor', doctorId],
        queryFn: async () => {
            const res = await api.get('clinic/bookings/')
            return res.data
        }
    })

    const activeStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULING_PENDING']
    const existingActiveBooking = myBookings?.find(b =>
        b.doctor === doctorId && activeStatuses.includes(b.status)
    )
    const hasActiveBooking = !!existingActiveBooking

    // Group slots by date
    const slotsByDate = (slotsData?.slots || []).reduce((acc, slot) => {
        const dateKey = format(parseISO(slot.datetime), 'yyyy-MM-dd')
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(slot)
        return acc
    }, {})

    // Add blocked dates to the list
    const blockedDates = slotsData?.blocked_dates || []
    blockedDates.forEach(dateStr => {
        // Ensure we don't overwrite existing slots (though theoretically shouldn't happen if blocked)
        if (!slotsByDate[dateStr]) {
            slotsByDate[dateStr] = 'BLOCKED'
        }
    })

    // Sort dates
    const sortedDateKeys = Object.keys(slotsByDate).sort()

    // Book appointment mutation - SAVES TO REAL DATABASE
    const bookMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('clinic/bookings/', {
                doctor: doctorId,
                booking_datetime: selectedSlot.datetime,
                booking_type: bookingType,
                number_of_people: numberOfPeople,
                patient_notes: ''
            })
            return res.data
        },
        onSuccess: () => {
            setBookingSuccess(true)
            queryClient.invalidateQueries(['myBookings'])
            queryClient.invalidateQueries(['doctorSlots', doctorId])
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
        },
        onError: (error) => {
            console.error("Booking Error:", error.response?.data || error)
            const errorMsg = error.response?.data?.detail ||
                error.response?.data?.error ||
                JSON.stringify(error.response?.data) ||
                (isRtl ? 'فشل الحجز' : 'Booking failed')
            toast.error(errorMsg)
        }
    })

    // Cancel existing booking mutation
    const cancelMutation = useMutation({
        mutationFn: async (bookingId) => {
            return api.post(`clinic/bookings/${bookingId}/patient_cancel/`)
        },
        onSuccess: () => {
            toast.success(isRtl ? 'تم إلغاء الحجز بنجاح! يمكنك الآن حجز موعد جديد' : 'Booking cancelled! You can now book a new appointment')
            queryClient.invalidateQueries(['myBookingsWithDoctor', doctorId])
            queryClient.invalidateQueries(['myBookings'])
            setShowCancelDialog(false)
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || (isRtl ? 'فشل إلغاء الحجز' : 'Failed to cancel booking'))
        }
    })

    const SocialIcon = ({ url, icon: Icon, color }) => {
        if (!url) return null
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors ${color}`}>
                <Icon className="h-5 w-5" />
            </a>
        )
    }

    if (bookingSuccess) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        {isRtl ? 'تم الحجز بنجاح!' : 'Booking Confirmed!'}
                    </h1>
                    <p className="text-gray-600 mb-2 max-w-md">
                        {isRtl
                            ? `موعدك يوم ${format(parseISO(selectedSlot.datetime), 'PPP', { locale: ar })} الساعة ${format(parseISO(selectedSlot.datetime), 'p')}`
                            : `Your appointment is on ${format(parseISO(selectedSlot.datetime), 'PPP')} at ${format(parseISO(selectedSlot.datetime), 'p')}`
                        }
                    </p>
                    <p className="text-sm text-primary mb-8">
                        {bookingType === 'NEW'
                            ? (isRtl ? '📋 حجز جديد' : '📋 New Patient')
                            : (isRtl ? '🔄 مراجعة' : '🔄 Follow-up')
                        }
                        {numberOfPeople > 1 && (
                            <span className="mr-2"> • {isRtl ? `${numberOfPeople} أشخاص` : `${numberOfPeople} people`}</span>
                        )}
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => navigate('/my-bookings')} className="gap-2">
                            {isRtl ? 'عرض حجوزاتي' : 'View My Bookings'}
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/patient')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {isRtl ? 'العودة للبحث' : 'Back to Search'}
                        </Button>
                    </div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {isRtl ? 'رجوع' : 'Back'}
                </Button>

                {/* Warning: Active Booking Exists */}
                {hasActiveBooking && (
                    <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-700 shadow-lg">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-start gap-4">
                                <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-2xl shadow-lg">
                                    <AlertTriangle className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400">
                                        {isRtl ? 'لديك حجز نشط بالفعل' : 'You Have an Active Booking'}
                                    </h3>

                                    {/* Current Booking Details Card */}
                                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 border-amber-200 dark:border-amber-700 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                                                <Clock className="h-6 w-6 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                    {format(parseISO(existingActiveBooking.booking_datetime), 'EEEE', { locale: isRtl ? ar : enUS })}
                                                </p>
                                                <p className="text-amber-700 dark:text-amber-300 font-medium">
                                                    {format(parseISO(existingActiveBooking.booking_datetime), 'PPP', { locale: isRtl ? ar : enUS })}
                                                </p>
                                                <p className="text-lg font-bold text-primary">
                                                    {format(parseISO(existingActiveBooking.booking_datetime), 'HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
                                        {isRtl
                                            ? 'لا يمكنك الحجز مجدداً إلا بعد إتمام أو إلغاء الحجز الحالي'
                                            : 'You can only book again after your current appointment is completed or cancelled'
                                        }
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        <Button
                                            className="bg-amber-600 hover:bg-amber-700 shadow-md"
                                            onClick={() => navigate('/my-bookings')}
                                        >
                                            <Clock className="h-4 w-4 mr-2" />
                                            {isRtl ? 'عرض حجوزاتي' : 'View My Bookings'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm"
                                            onClick={() => setShowCancelDialog(true)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {isRtl ? 'إلغاء الحجز الحالي' : 'Cancel Current Booking'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cancel Confirmation Dialog */}
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                <Trash2 className="h-5 w-5" />
                                {isRtl ? 'تأكيد إلغاء الحجز' : 'Confirm Cancellation'}
                            </DialogTitle>
                            <DialogDescription className="pt-2">
                                {isRtl
                                    ? 'هل أنت متأكد من إلغاء هذا الحجز؟ سيتم إخطار الطبيب بالإلغاء.'
                                    : 'Are you sure you want to cancel this booking? The doctor will be notified.'
                                }
                            </DialogDescription>
                        </DialogHeader>
                        {existingActiveBooking && (
                            <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="font-semibold text-red-800 dark:text-red-400">
                                    {format(parseISO(existingActiveBooking.booking_datetime), 'EEEE, PPP', { locale: isRtl ? ar : enUS })}
                                </p>
                                <p className="text-red-600 dark:text-red-300 text-lg font-bold">
                                    {format(parseISO(existingActiveBooking.booking_datetime), 'HH:mm')}
                                </p>
                            </div>
                        )}
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                                {isRtl ? 'تراجع' : 'Go Back'}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => cancelMutation.mutate(existingActiveBooking.id)}
                                disabled={cancelMutation.isPending}
                            >
                                {cancelMutation.isPending
                                    ? (isRtl ? 'جاري الإلغاء...' : 'Cancelling...')
                                    : (isRtl ? 'نعم، إلغاء الحجز' : 'Yes, Cancel')
                                }
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Doctor Header & Bio */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden shrink-0">
                                {doctor?.profile_picture ? (
                                    <img src={doctor.profile_picture} alt="Dr." className="h-full w-full object-cover" />
                                ) : (
                                    <Stethoscope className="h-10 w-10" />
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                <CardTitle className="text-2xl md:text-3xl">
                                    Dr. {doctor?.first_name || 'Doctor'} {doctor?.last_name || ''}
                                </CardTitle>
                                <CardDescription className="text-lg font-medium text-primary">
                                    {doctor?.specialty || 'General Practitioner'}
                                </CardDescription>

                                {/* Social Media Icons */}
                                <div className="flex gap-2 pt-1">
                                    <SocialIcon url={doctor?.facebook} icon={Facebook} color="text-blue-600" />
                                    <SocialIcon url={doctor?.instagram} icon={Instagram} color="text-pink-600" />
                                    <SocialIcon url={doctor?.twitter} icon={Twitter} color="text-sky-500" />
                                    <SocialIcon url={doctor?.youtube} icon={Youtube} color="text-red-600" />
                                    <SocialIcon url={doctor?.tiktok} icon={Video} color="text-black" />
                                </div>
                            </div>
                            <div className="text-right hidden md:block">
                                <div className="text-2xl font-bold text-primary">{doctor?.consultation_price ? `$${doctor.consultation_price}` : 'Free'}</div>
                                <div className="text-sm text-muted-foreground">{isRtl ? 'سعر الكشفية' : 'Consultation Fee'}</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Bio */}
                        {doctor?.bio && (
                            <div className="bg-muted/30 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    {isRtl ? 'نبذة عن الطبيب' : 'About Doctor'}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {doctor.bio}
                                </p>
                            </div>
                        )}

                        {/* Location Details */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    {isRtl ? 'العنوان' : 'Address'}
                                </h3>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    {doctor?.location && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>{doctor.location}</span>
                                        </div>
                                    )}
                                    {doctor?.landmark && (
                                        <div className="flex items-start gap-2">
                                            <Building className="h-4 w-4 mt-0.5 shrink-0" />
                                            <span>{isRtl ? 'نقطة دالة: ' : 'Landmark: '}{doctor.landmark}</span>
                                        </div>
                                    )}
                                    {!doctor?.location && !doctor?.landmark && (
                                        <span className="italic opacity-70">{isRtl ? 'لم يتم تحديد العنوان' : 'No address provided'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Map Preview */}
                            {(doctor?.latitude && doctor?.longitude) ? (
                                <div className="rounded-xl overflow-hidden border">
                                    <MapPicker
                                        latitude={parseFloat(doctor.latitude)}
                                        longitude={parseFloat(doctor.longitude)}
                                        readonly={true}
                                        isRtl={isRtl}
                                    />
                                </div>
                            ) : (
                                <div className="h-32 bg-muted/50 rounded-xl flex items-center justify-center text-muted-foreground text-sm border border-dashed">
                                    {isRtl ? 'الموقع غير محدد على الخريطة' : 'Map location not set'}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Booking Type Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>{isRtl ? 'نوع الحجز' : 'Booking Type'}</CardTitle>
                        <CardDescription>
                            {isRtl ? 'اختر نوع الزيارة' : 'Select your visit type'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                className={`cursor-pointer rounded-xl border-2 p-6 flex flex-col items-center gap-3 transition-all
                                    ${bookingType === 'NEW' ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-gray-300'}`}
                                onClick={() => setBookingType('NEW')}
                            >
                                <UserPlus className={`h-8 w-8 ${bookingType === 'NEW' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="font-semibold">{isRtl ? 'زيارة جديدة' : 'New Visit'}</span>
                                <span className="text-xs text-muted-foreground text-center">
                                    {isRtl ? 'أول زيارة لهذا الطبيب' : 'First time visiting'}
                                </span>
                            </div>
                            <div
                                className={`cursor-pointer rounded-xl border-2 p-6 flex flex-col items-center gap-3 transition-all
                                    ${bookingType === 'FOLLOWUP' ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-gray-300'}`}
                                onClick={() => setBookingType('FOLLOWUP')}
                            >
                                <RefreshCw className={`h-8 w-8 ${bookingType === 'FOLLOWUP' ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="font-semibold">{isRtl ? 'مراجعة' : 'Follow-up'}</span>
                                <span className="text-xs text-muted-foreground text-center">
                                    {isRtl ? 'زيارة متابعة لحالة سابقة' : 'Follow-up visit'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Number of People Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {isRtl ? 'عدد الأشخاص' : 'Number of People'}
                        </CardTitle>
                        <CardDescription>
                            {isRtl ? 'كم شخص تريد الحجز لهم؟ (الحد الأقصى 5)' : 'How many people are you booking for? (Max 5)'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <Label htmlFor="numberOfPeople" className="text-base">
                                {isRtl ? 'عدد الأشخاص:' : 'People:'}
                            </Label>
                            <select
                                id="numberOfPeople"
                                value={numberOfPeople}
                                onChange={(e) => setNumberOfPeople(Number(e.target.value))}
                                className="w-28 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                {[1, 2, 3, 4, 5].map(num => (
                                    <option key={num} value={num}>
                                        {num} {num === 1 ? (isRtl ? 'شخص' : 'person') : (isRtl ? 'أشخاص' : 'people')}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {numberOfPeople > 1 && selectedSlot && selectedSlot.available_spots < numberOfPeople && (
                            <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
                                ⚠️ {isRtl
                                    ? `الموعد المختار به ${selectedSlot.available_spots} أماكن فقط. سيتم توزيع الباقي على المواعيد التالية تلقائياً.`
                                    : `Selected slot has only ${selectedSlot.available_spots} spots. Remaining will be auto-distributed to next slots.`
                                }
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Available Slots */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold">
                        {isRtl ? 'المواعيد المتاحة' : 'Available Appointments'}
                    </h2>

                    {slotsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : Object.keys(slotsByDate).length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>{isRtl ? 'لا توجد مواعيد متاحة حالياً' : 'No available slots'}</p>
                                <p className="text-sm mt-2">
                                    {isRtl ? 'الطبيب لم يحدد جدول دوامه بعد' : "Doctor hasn't set their schedule yet"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        sortedDateKeys.map((dateKey) => {
                            const dayData = slotsByDate[dateKey]
                            const isBlocked = dayData === 'BLOCKED'

                            return (
                                <Card key={dateKey} className={isBlocked ? "border-red-200 bg-red-50" : ""}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg">
                                                {format(new Date(dateKey), 'EEEE, d MMMM', { locale: isRtl ? ar : enUS })}
                                            </CardTitle>
                                            {isBlocked && (
                                                <span className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-200">
                                                    {isRtl ? 'الحجز متوقف' : 'Booking Stopped'}
                                                </span>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {isBlocked ? (
                                            <div className="text-center py-6 text-red-500 font-medium">
                                                <p>{isRtl ? 'نعتذر، الحجز غير متاح لهذا اليوم' : 'Sorry, booking is stopped for this day'}</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {dayData.map((slot, idx) => (
                                                    <Button
                                                        key={idx}
                                                        variant={slot.is_full ? "ghost" : (selectedSlot?.datetime === slot.datetime ? "default" : "outline")}
                                                        size="sm"
                                                        className={`gap-2 ${slot.is_full ? 'opacity-50 cursor-not-allowed border-red-300 bg-red-50 text-red-600 hover:bg-red-50' : ''}`}
                                                        onClick={() => !slot.is_full && setSelectedSlot(slot)}
                                                        disabled={slot.is_full}
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                        {format(parseISO(slot.datetime), 'h:mm a')}
                                                        {slot.is_full ? (
                                                            <span className="text-xs font-bold text-red-600">
                                                                {isRtl ? 'مكتمل' : 'FULL'}
                                                            </span>
                                                        ) : slot.booked_people > 0 && (
                                                            <span className="text-xs opacity-70">
                                                                ({slot.booked_people}/{slot.max_spots} {isRtl ? 'محجوز' : 'booked'})
                                                            </span>
                                                        )}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>

                {/* Confirm Button */}
                <div className="sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border shadow-lg">
                    <Button
                        className="w-full h-12 text-lg"
                        disabled={!selectedSlot || bookMutation.isPending || hasActiveBooking}
                        onClick={() => bookMutation.mutate()}
                    >
                        {hasActiveBooking
                            ? (isRtl ? 'لديك حجز نشط بالفعل' : 'You have an active booking')
                            : bookMutation.isPending
                                ? (isRtl ? 'جاري الحجز...' : 'Booking...')
                                : selectedSlot
                                    ? (isRtl
                                        ? `تأكيد الحجز - ${format(parseISO(selectedSlot.datetime), 'p')}`
                                        : `Confirm Booking - ${format(parseISO(selectedSlot.datetime), 'p')}`)
                                    : (isRtl ? 'اختر موعداً' : 'Select a time slot')
                        }
                    </Button>
                </div>
            </div>
        </Layout>
    )
}

export default DoctorBookingPage
