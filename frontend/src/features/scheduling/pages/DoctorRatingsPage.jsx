import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Star, User, Loader2, MessageSquare, X, Trash2 } from 'lucide-react'

// Response Modal for Doctor
const ResponseModal = ({ isOpen, onClose, rating, isRtl, onSuccess }) => {
    const [response, setResponse] = useState('')
    const queryClient = useQueryClient()

    const respondMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post(`clinic/ratings/${rating.id}/respond/`, {
                response: response
            })
            return res.data
        },
        onSuccess: () => {
            toast.success(isRtl ? 'تم إرسال الرد' : 'Response sent!')
            queryClient.invalidateQueries(['doctorRatings'])
            onSuccess?.()
            onClose()
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to send response')
        }
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">
                        {isRtl ? 'الرد على التقييم' : 'Respond to Rating'}
                    </h3>
                    <button onClick={onClose}>
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-muted rounded-lg">
                    <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-4 w-4 ${s <= rating?.stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                        ))}
                    </div>
                    <p className="text-sm">{rating?.comment || (isRtl ? 'لا يوجد تعليق' : 'No comment')}</p>
                    <p className="text-xs text-muted-foreground mt-1">- {rating?.patient_name}</p>
                </div>

                <textarea
                    className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-primary"
                    rows={3}
                    placeholder={isRtl ? 'اكتب ردك على التقييم...' : 'Write your response...'}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                />

                <Button
                    className="w-full mt-4"
                    onClick={() => respondMutation.mutate()}
                    disabled={!response.trim() || respondMutation.isPending}
                >
                    {respondMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRtl ? 'إرسال الرد' : 'Send Response')}
                </Button>
            </div>
        </div>
    )
}

const DoctorRatingsPage = () => {
    const { i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const [selectedRating, setSelectedRating] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)

    // Fetch doctor's ratings
    const { data: ratings, isLoading } = useQuery({
        queryKey: ['doctorRatings'],
        queryFn: async () => {
            const res = await api.get('clinic/ratings/')
            return res.data
        }
    })

    const renderStars = (count) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`h-4 w-4 ${s <= count ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
            ))}
        </div>
    )

    const pendingResponses = ratings?.filter(r => !r.doctor_response) || []
    const respondedRatings = ratings?.filter(r => r.doctor_response) || []

    const averageRating = ratings?.length
        ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
        : 0

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">{isRtl ? 'تقييمات المرضى' : 'Patient Ratings'}</h1>
                    <p className="text-muted-foreground">
                        {isRtl ? 'عرض والرد على تقييمات مرضاك' : 'View and respond to your patient ratings'}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold text-primary">{ratings?.length || 0}</p>
                            <p className="text-sm text-muted-foreground">{isRtl ? 'إجمالي التقييمات' : 'Total Ratings'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                                <span className="text-3xl font-bold">{averageRating}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{isRtl ? 'المتوسط' : 'Average'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold text-orange-500">{pendingResponses.length}</p>
                            <p className="text-sm text-muted-foreground">{isRtl ? 'بانتظار الرد' : 'Pending Response'}</p>
                        </CardContent>
                    </Card>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* Pending Response */}
                        {pendingResponses.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-orange-500" />
                                    {isRtl ? 'بحاجة للرد' : 'Awaiting Your Response'}
                                </h2>
                                {pendingResponses.map(rating => (
                                    <Card key={rating.id} className="border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-700 dark:text-orange-400">
                                                        <User className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold">{rating.patient_name}</h3>
                                                        <div className="flex items-center gap-2 my-1">
                                                            {renderStars(rating.stars)}
                                                            <span className="text-xs text-muted-foreground">
                                                                {format(new Date(rating.created_at), 'PPP')}
                                                            </span>
                                                        </div>
                                                        {rating.comment && (
                                                            <p className="text-muted-foreground text-sm mt-2">"{rating.comment}"</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button onClick={() => { setSelectedRating(rating); setModalOpen(true) }}>
                                                    <MessageSquare className="h-4 w-4 mr-2" />
                                                    {isRtl ? 'رد' : 'Respond'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Already Responded */}
                        {respondedRatings.length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">
                                    {isRtl ? 'التقييمات المُجاب عليها' : 'Responded'}
                                </h2>
                                {respondedRatings.map(rating => (
                                    <Card key={rating.id}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <User className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="font-semibold">{rating.patient_name}</h3>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(rating.created_at), 'PPP')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 my-1">
                                                        {renderStars(rating.stars)}
                                                    </div>
                                                    {rating.comment && (
                                                        <p className="text-muted-foreground text-sm">"{rating.comment}"</p>
                                                    )}
                                                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
                                                        <p className="text-xs font-medium text-primary mb-1">{isRtl ? 'ردك:' : 'Your response:'}</p>
                                                        <p className="text-sm">{rating.doctor_response}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {ratings?.length === 0 && (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>{isRtl ? 'لا توجد تقييمات بعد' : 'No ratings yet'}</p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>

            <ResponseModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                rating={selectedRating}
                isRtl={isRtl}
            />
        </Layout>
    )
}

export default DoctorRatingsPage
