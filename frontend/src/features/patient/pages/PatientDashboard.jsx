import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import { Search, Stethoscope, Star, Calendar, MapPin, DollarSign, Sparkles, Users } from 'lucide-react'

const PatientDashboard = () => {
    const { t, i18n } = useTranslation()
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const isRtl = i18n.language === 'ar'

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const { data: doctorsData, isLoading } = useQuery({
        queryKey: ['doctors', debouncedSearch],
        queryFn: async () => {
            const params = debouncedSearch ? { search: debouncedSearch } : {}
            const res = await api.get('doctors/', { params })
            return res.data
        },
        placeholderData: keepPreviousData
    })

    const filteredDoctors = doctorsData?.results || doctorsData || []

    // Color palette for doctor cards
    const cardColors = [
        { gradient: 'from-blue-500 to-indigo-500', light: 'bg-blue-500/10', text: 'text-blue-500' },
        { gradient: 'from-emerald-500 to-teal-500', light: 'bg-emerald-500/10', text: 'text-emerald-500' },
        { gradient: 'from-purple-500 to-violet-500', light: 'bg-purple-500/10', text: 'text-purple-500' },
        { gradient: 'from-rose-500 to-pink-500', light: 'bg-rose-500/10', text: 'text-rose-500' },
        { gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-500/10', text: 'text-amber-500' },
        { gradient: 'from-cyan-500 to-sky-500', light: 'bg-cyan-500/10', text: 'text-cyan-500' },
    ]

    return (
        <Layout>
            <div className="space-y-8">
                {/* Hero Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 text-white">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtNGgydjRoNHYyaC00djRoLTJ2LTR6bTAtMzBoLTJ2LTRoMlYwaDF2NGg0djJoLTR2NGgtMlY0em0tMzAgMGgtMnYtNGgyVjBoMnY0aDR2MmgtNHY0aC0yVjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                    <Stethoscope className="absolute top-6 right-8 h-32 w-32 text-white/10" />

                    <div className="relative z-10 text-center max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm font-medium mb-4">
                            <Sparkles className="h-4 w-4" />
                            {isRtl ? 'أفضل الأطباء' : 'Top Doctors'}
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                            {isRtl ? 'ابحث عن طبيبك' : 'Find Your Doctor'}
                        </h1>
                        <p className="text-white/80 mb-6">
                            {isRtl ? 'اختر طبيبك واحجز موعدك بسهولة وسرعة' : 'Choose your doctor and book an appointment easily'}
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-xl mx-auto relative">
                            <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder={isRtl ? "ابحث بالاسم أو التخصص..." : "Search by name or specialty..."}
                                className="ps-12 h-14 text-base rounded-2xl bg-background text-foreground shadow-xl border-0 focus-visible:ring-2 focus-visible:ring-white/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Results count */}
                {!isLoading && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {isRtl
                                ? `${filteredDoctors.length} طبيب متاح`
                                : `${filteredDoctors.length} doctors available`
                            }
                        </p>
                    </div>
                )}

                {/* Doctors Grid */}
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="rounded-2xl border bg-card p-6 animate-pulse space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 bg-muted rounded-2xl"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-muted rounded w-3/4"></div>
                                        <div className="h-3 bg-muted rounded w-1/2"></div>
                                    </div>
                                </div>
                                <div className="h-10 bg-muted rounded-xl"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredDoctors.map((doctor, idx) => {
                            const color = cardColors[idx % cardColors.length]
                            return (
                                <div
                                    key={doctor.id}
                                    className="group relative rounded-2xl border bg-card overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                                >
                                    {/* Top gradient accent */}
                                    <div className={`h-1.5 bg-gradient-to-r ${color.gradient}`}></div>

                                    <div className="p-5">
                                        {/* Doctor Info */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${color.gradient} flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                                {doctor.profile_picture ? (
                                                    <img src={doctor.profile_picture} alt={doctor.first_name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Stethoscope className="h-7 w-7" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-lg truncate">
                                                    Dr. {doctor.first_name} {doctor.last_name}
                                                </h3>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${color.light} ${color.text}`}>
                                                    <Stethoscope className="h-3 w-3" />
                                                    {doctor.specialty || (isRtl ? 'طب عام' : 'General')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="flex items-center justify-between mb-4 py-3 px-4 rounded-xl bg-muted/50">
                                            {/* Rating */}
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star
                                                            key={star}
                                                            className={`h-3.5 w-3.5 ${star <= Math.round(doctor.average_rating || 0)
                                                                ? 'fill-yellow-400 text-yellow-400'
                                                                : 'text-gray-300 dark:text-gray-600'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {doctor.average_rating || '0'}
                                                    {doctor.ratings_count > 0 && (
                                                        <span className="ms-0.5">({doctor.ratings_count})</span>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Price */}
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    {doctor.consultation_price || '0'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Location if available */}
                                        {doctor.location && (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span className="truncate">{doctor.location}</span>
                                            </div>
                                        )}

                                        {/* Book Button */}
                                        <Link to={`/doctor/${doctor.id}/book`}>
                                            <Button className={`w-full gap-2 rounded-xl h-11 bg-gradient-to-r ${color.gradient} hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-300`}>
                                                <Calendar className="h-4 w-4" />
                                                {isRtl ? 'احجز موعد' : 'Book Appointment'}
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Empty State */}
                {filteredDoctors.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                            <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-lg font-semibold mb-1">
                            {isRtl ? 'لا يوجد أطباء' : 'No Doctors Found'}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {isRtl ? 'جرب البحث بكلمات مختلفة' : 'Try searching with different terms'}
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default PatientDashboard
