import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { Camera, Save, MapPin, Building, Loader2, Map, Phone, Mail, Stethoscope, DollarSign, Pencil, X, Sparkles, Facebook, Instagram, Youtube, Globe, BookOpen } from 'lucide-react'
import MapPicker from '@/components/ui/MapPicker'

const DoctorProfilePage = () => {
    const { i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const [isEditing, setIsEditing] = useState(false)
    const fileInputRef = useRef(null)
    const queryClient = useQueryClient()

    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => (await api.get('auth/me/')).data
    })

    const [formData, setFormData] = useState({
        first_name: '', last_name: '', phone: '', specialty: '', consultation_price: '',
        bio: '', location: '', landmark: '', latitude: null, longitude: null,
        facebook: '', instagram: '', tiktok: '', twitter: '', youtube: ''
    })

    React.useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '', last_name: user.last_name || '', phone: user.phone || '',
                specialty: user.profile?.specialty || '', consultation_price: user.profile?.consultation_price || '',
                bio: user.profile?.bio || '', location: user.profile?.location || '', landmark: user.profile?.landmark || '',
                latitude: user.profile?.latitude ? parseFloat(user.profile.latitude) : null,
                longitude: user.profile?.longitude ? parseFloat(user.profile.longitude) : null,
                facebook: user.profile?.facebook || '', instagram: user.profile?.instagram || '',
                tiktok: user.profile?.tiktok || '', twitter: user.profile?.twitter || '', youtube: user.profile?.youtube || ''
            })
        }
    }, [user])

    const updateUserMutation = useMutation({
        mutationFn: async (data) => {
            const fd = new FormData()
            Object.keys(data).forEach(k => data[k] && fd.append(k, data[k]))
            return (await api.patch('auth/profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
        },
        onSuccess: () => queryClient.invalidateQueries(['currentUser'])
    })

    const updateDoctorMutation = useMutation({
        mutationFn: async (data) => (await api.patch('doctors/profile/', data)).data,
        onSuccess: () => {
            toast.success(isRtl ? 'تم حفظ البيانات ✅' : 'Saved! ✅')
            queryClient.invalidateQueries(['currentUser'])
            setIsEditing(false)
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    })

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) { updateUserMutation.mutate({ profile_picture: file }); toast.success(isRtl ? 'تم رفع الصورة' : 'Uploaded!') }
    }
    const handleLocationSelect = (lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))

    const handleSave = async () => {
        await updateUserMutation.mutateAsync({ first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone })
        await updateDoctorMutation.mutateAsync({
            specialty: formData.specialty, consultation_price: formData.consultation_price, bio: formData.bio,
            location: formData.location, landmark: formData.landmark, latitude: formData.latitude, longitude: formData.longitude,
            facebook: formData.facebook, instagram: formData.instagram, tiktok: formData.tiktok, twitter: formData.twitter, youtube: formData.youtube
        })
    }

    if (isLoading) return (
        <Layout>
            <div className="flex justify-center py-20">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin"></div>
                    <Sparkles className="h-6 w-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
            </div>
        </Layout>
    )

    const profilePicUrl = user?.profile_picture_url || (user?.profile_picture ? `http://localhost:8000${user.profile_picture}` : null)
    const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`

    // Section wrapper component
    const Section = ({ icon: Icon, title, children, iconColor = 'text-emerald-500', iconBg = 'bg-emerald-500/10' }) => (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-muted/30">
                <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <h3 className="font-semibold text-sm">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    )

    // Field display component
    const Field = ({ label, name, value, icon: Icon, iconColor = 'text-muted-foreground', type = 'text', placeholder = '', dir }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                {Icon && <Icon className={`h-3.5 w-3.5 ${iconColor}`} />}
                {label}
            </label>
            {isEditing ? (
                <Input
                    name={name}
                    type={type}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    dir={dir}
                    className="rounded-lg border-primary/20 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                />
            ) : (
                <p className={`text-sm font-medium px-1 py-1 ${!value ? 'text-muted-foreground/50 italic' : ''}`} dir={dir}>
                    {value || '—'}
                </p>
            )}
        </div>
    )

    const socialLinks = [
        { name: 'facebook', icon: Facebook, label: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-500/10', placeholder: 'https://facebook.com/...' },
        { name: 'instagram', icon: Instagram, label: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-500/10', placeholder: 'https://instagram.com/...' },
        { name: 'tiktok', icon: Globe, label: 'TikTok', color: 'text-gray-800 dark:text-gray-200', bg: 'bg-gray-500/10', placeholder: 'https://tiktok.com/...' },
        { name: 'twitter', icon: Globe, label: 'X (Twitter)', color: 'text-gray-800 dark:text-gray-200', bg: 'bg-gray-500/10', placeholder: 'https://x.com/...' },
        { name: 'youtube', icon: Youtube, label: 'YouTube', color: 'text-red-600', bg: 'bg-red-500/10', placeholder: 'https://youtube.com/...' },
    ]

    return (
        <Layout>
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl">
                    <div className="h-44 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 relative">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnYtNGgydjRoNHYyaC00djRoLTJ2LTR6bTAtMzBoLTJ2LTRoMlYwaDF2NGg0djJoLTR2NGgtMlY0em0tMzAgMGgtMnYtNGgyVjBoMnY0aDR2MmgtNHY0aC0yVjR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
                        {/* Stethoscope watermark */}
                        <Stethoscope className="absolute top-4 right-6 h-24 w-24 text-white/10" />
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent"></div>
                    </div>

                    <div className="relative -mt-16 px-6 pb-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                            {/* Profile Picture */}
                            <div className="relative group shrink-0">
                                <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl ring-4 ring-background overflow-hidden">
                                    {profilePicUrl ? (
                                        <img src={profilePicUrl} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        initials || 'D'
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-all hover:scale-110"
                                >
                                    <Camera className="h-4 w-4" />
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </div>

                            {/* Name & Specialty */}
                            <div className="flex-1 text-center sm:text-start pb-1">
                                <h1 className="text-2xl font-bold tracking-tight">
                                    Dr. {user?.first_name} {user?.last_name}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
                                        <Stethoscope className="h-3 w-3" />
                                        {user?.profile?.specialty || (isRtl ? 'طبيب' : 'Doctor')}
                                    </span>
                                    {user?.profile?.consultation_price && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            <DollarSign className="h-3 w-3" />
                                            {user.profile.consultation_price} {isRtl ? 'د.ع' : 'IQD'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Edit Toggle */}
                            <div className="shrink-0">
                                {!isEditing ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                        className="gap-2 rounded-xl hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-300"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        {isRtl ? 'تعديل' : 'Edit'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(false)}
                                        className="gap-2 rounded-xl text-muted-foreground"
                                    >
                                        <X className="h-4 w-4" />
                                        {isRtl ? 'إلغاء' : 'Cancel'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personal Information */}
                <Section icon={Sparkles} title={isRtl ? 'المعلومات الشخصية' : 'Personal Information'} iconColor="text-blue-500" iconBg="bg-blue-500/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label={isRtl ? 'الاسم الأول' : 'First Name'} name="first_name" value={formData.first_name} />
                        <Field label={isRtl ? 'الاسم الأخير' : 'Last Name'} name="last_name" value={formData.last_name} />
                        <Field label={isRtl ? 'التخصص' : 'Specialty'} name="specialty" value={formData.specialty} icon={Stethoscope} iconColor="text-emerald-500" />
                        <Field label={isRtl ? 'سعر الكشف' : 'Consultation Price'} name="consultation_price" value={formData.consultation_price} icon={DollarSign} iconColor="text-amber-500" type="number" />
                        <Field label={isRtl ? 'رقم الهاتف' : 'Phone'} name="phone" value={formData.phone} icon={Phone} iconColor="text-emerald-500" dir="ltr" />
                        <div className="flex items-center gap-2 px-1 py-1">
                            <Mail className="h-3.5 w-3.5 text-orange-500" />
                            <div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{isRtl ? 'البريد' : 'Email'}</span>
                                <p className="text-sm font-medium text-muted-foreground">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Bio */}
                <Section icon={BookOpen} title={isRtl ? 'نبذة عني' : 'About Me'} iconColor="text-violet-500" iconBg="bg-violet-500/10">
                    {isEditing ? (
                        <textarea
                            name="bio"
                            className="w-full p-4 border rounded-xl resize-none min-h-[100px] bg-background focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-sm"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder={isRtl ? 'اكتب نبذة عنك...' : 'Write something about yourself...'}
                        />
                    ) : (
                        <p className={`text-sm leading-relaxed ${!formData.bio ? 'text-muted-foreground/50 italic' : ''}`}>
                            {formData.bio || (isRtl ? 'لم تتم إضافة نبذة بعد' : 'No bio added yet')}
                        </p>
                    )}
                </Section>

                {/* Clinic & Location */}
                <Section icon={Building} title={isRtl ? 'العيادة والموقع' : 'Clinic & Location'} iconColor="text-rose-500" iconBg="bg-rose-500/10">
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Field label={isRtl ? 'عنوان العيادة' : 'Clinic Address'} name="location" value={formData.location} icon={Building} iconColor="text-rose-500" placeholder={isRtl ? 'حي الزهور، الموصل' : 'Al-Zuhoor, Mosul'} />
                            <Field label={isRtl ? 'نقطة دالة' : 'Landmark'} name="landmark" value={formData.landmark} icon={MapPin} iconColor="text-rose-500" placeholder={isRtl ? 'مقابل جامع...' : 'Near mosque...'} />
                        </div>

                        {/* Map */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <Map className="h-3.5 w-3.5 text-rose-500" />
                                {isRtl ? 'الموقع على الخريطة' : 'Map Location'}
                            </label>
                            <div className="rounded-xl overflow-hidden border">
                                <MapPicker latitude={formData.latitude} longitude={formData.longitude} onLocationSelect={handleLocationSelect} readonly={!isEditing} isRtl={isRtl} />
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Social Media */}
                <Section icon={Globe} title={isRtl ? 'روابط التواصل الاجتماعي' : 'Social Media'} iconColor="text-indigo-500" iconBg="bg-indigo-500/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {socialLinks.map(link => (
                            <div key={link.name} className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-xl ${link.bg} flex items-center justify-center shrink-0`}>
                                    <link.icon className={`h-4 w-4 ${link.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <label className="text-xs font-medium text-muted-foreground">{link.label}</label>
                                    {isEditing ? (
                                        <Input
                                            name={link.name}
                                            value={formData[link.name]}
                                            onChange={handleChange}
                                            placeholder={link.placeholder}
                                            dir="ltr"
                                            className="h-8 text-xs rounded-lg border-primary/20"
                                        />
                                    ) : (
                                        <p className={`text-xs truncate ${formData[link.name] ? 'text-primary' : 'text-muted-foreground/50 italic'}`} dir="ltr">
                                            {formData[link.name] || '—'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Save Button */}
                {isEditing && (
                    <div className="flex justify-center pb-6">
                        <Button
                            onClick={handleSave}
                            disabled={updateDoctorMutation.isPending}
                            className="gap-2 px-10 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                            size="lg"
                        >
                            {updateDoctorMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            {updateDoctorMutation.isPending
                                ? (isRtl ? 'جاري الحفظ...' : 'Saving...')
                                : (isRtl ? 'حفظ التغييرات' : 'Save Changes')}
                        </Button>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default DoctorProfilePage
