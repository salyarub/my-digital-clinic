import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import api from '@/lib/axios'
import Layout from '@/components/layout/Layout'
import SmartSlotPicker from '@/features/rescheduling/SmartSlotPicker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

const ReschedulePage = () => {
    const { token } = useParams()
    const { t } = useTranslation()
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [isSuccess, setIsSuccess] = useState(false)

    // Fetch Rescheduling Data
    const { data, isLoading, error } = useQuery({
        queryKey: ['reschedule', token],
        queryFn: async () => {
            const res = await api.get(`public/reschedule/${token}/`)
            return res.data
        },
        enabled: !!token
    })

    // Confirm Mutation
    const confirmMutation = useMutation({
        mutationFn: async () => {
            await api.post(`public/reschedule/${token}/`, { selected_slot: selectedSlot })
        },
        onSuccess: () => {
            setIsSuccess(true)
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            })
        }
    })

    if (error) return <Layout><div className="text-center text-red-500 p-10">{t('common.error')}</div></Layout>

    if (isSuccess) {
        return (
            <Layout>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                >
                    <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('patient.successMsg')}</h1>
                    <p className="text-gray-600 mb-8 max-w-md">
                        Your appointment has been confirmed for {new Date(selectedSlot).toLocaleString()}.
                    </p>
                    <Button variant="outline" className="min-w-[200px]">
                        {t('patient.addToCalendar')}
                    </Button>
                </motion.div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">{t('patient.rescheduleTitle')}</h1>
                    <p className="text-muted-foreground">
                        {t('common.brandName')} - Dr. {data?.doctor_name}
                    </p>
                </div>

                {/* Original Booking (Dimmed) */}
                <Card className="bg-muted/50 opacity-70 border-dashed">
                    <div className="p-4 flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{t('patient.originalBooking')}</p>
                            <p className="text-sm">
                                {data?.original_booking_details?.booking_datetime
                                    ? new Date(data.original_booking_details.booking_datetime).toLocaleString()
                                    : '---'}
                            </p>
                        </div>
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {t('patient.cancelled')}
                        </span>
                    </div>
                </Card>

                {/* Picker */}
                <SmartSlotPicker
                    slots={data?.suggested_slots || []}
                    isLoading={isLoading}
                    selectedSlot={selectedSlot}
                    onSelect={setSelectedSlot}
                />

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <Button
                        size="lg"
                        disabled={!selectedSlot || confirmMutation.isPending}
                        onClick={() => confirmMutation.mutate()}
                        className="w-full sm:w-auto"
                    >
                        {confirmMutation.isPending ? t('common.loading') : t('patient.confirmSlot')}
                    </Button>
                </div>
            </div>
        </Layout>
    )
}

export default ReschedulePage
