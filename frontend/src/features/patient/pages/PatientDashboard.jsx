import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import { Search, Stethoscope, Star, Calendar } from 'lucide-react'

const PatientDashboard = () => {
    const { t, i18n } = useTranslation()
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('') // Actual API search term
    const isRtl = i18n.language === 'ar'

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
        }, 500) // Wait 500ms after user stops typing
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Fetch doctors with server-side search (using debounced term)
    const { data: doctorsData, isLoading } = useQuery({
        queryKey: ['doctors', debouncedSearch], // Refetch when search changes
        queryFn: async () => {
            const params = debouncedSearch ? { search: debouncedSearch } : {}
            const res = await api.get('doctors/', { params })
            return res.data
        },
        placeholderData: keepPreviousData // Keep showing old results while fetching new ones (v5)
    })

    // Handle both paginated (city-scale) and simple responses
    const filteredDoctors = doctorsData?.results || doctorsData || []

    return (
        <Layout>
            <div className="space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isRtl ? 'ابحث عن طبيب' : 'Find a Doctor'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isRtl ? 'اختر طبيبك واحجز موعدك بسهولة' : 'Choose your doctor and book an appointment easily'}
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-xl mx-auto relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={isRtl ? "ابحث بالاسم أو التخصص..." : "Search by name or specialty..."}
                        className="ps-10 h-12 text-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Doctors Grid */}
                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="space-y-2">
                                    <div className="h-12 w-12 bg-muted rounded-full"></div>
                                    <div className="h-4 bg-muted rounded w-3/4"></div>
                                    <div className="h-3 bg-muted rounded w-1/2"></div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredDoctors.map(doctor => (
                            <Card key={doctor.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                                <CardHeader>
                                    <div className="flex items-start gap-4">
                                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors overflow-hidden">
                                            {doctor.profile_picture ? (
                                                <img src={doctor.profile_picture} alt={doctor.first_name} className="h-full w-full object-cover" />
                                            ) : (
                                                <Stethoscope className="h-7 w-7" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">
                                                Dr. {doctor.first_name} {doctor.last_name}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-1">
                                                {doctor.specialty || 'General'}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                            {doctor.average_rating || 0}
                                            {doctor.ratings_count > 0 && (
                                                <span className="text-xs">({doctor.ratings_count})</span>
                                            )}
                                        </span>
                                        <span className="font-semibold text-primary">
                                            ${doctor.consultation_price || '0'}
                                        </span>
                                    </div>
                                    <Link to={`/doctor/${doctor.id}/book`}>
                                        <Button className="w-full gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {isRtl ? 'احجز موعد' : 'Book Appointment'}
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {filteredDoctors.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                        {isRtl ? 'لا يوجد أطباء مطابقين للبحث' : 'No doctors found matching your search'}
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default PatientDashboard
