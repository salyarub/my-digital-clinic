import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { User, Camera, Save, MapPin, Building, Loader2, Map } from 'lucide-react'
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

    if (isLoading) return <Layout><div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></Layout>

    const profilePicUrl = user?.profile_picture_url || (user?.profile_picture ? `http://localhost:8000${user.profile_picture}` : null)

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">{isRtl ? 'ملفي الشخصي' : 'My Profile'}</h1>
                </div>

                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto relative">
                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold overflow-hidden">
                                {profilePicUrl ? <img src={profilePicUrl} alt="Profile" className="h-full w-full object-cover" /> : user?.first_name?.charAt(0) || 'D'}
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                                <Camera className="h-4 w-4" />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </div>
                        <CardTitle className="mt-4">Dr. {user?.first_name} {user?.last_name}</CardTitle>
                        <CardDescription>{user?.profile?.specialty || 'Specialist'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>{isRtl ? 'الاسم الأول' : 'First Name'}</Label><Input name="first_name" value={formData.first_name} onChange={handleChange} disabled={!isEditing} /></div>
                            <div><Label>{isRtl ? 'الاسم الأخير' : 'Last Name'}</Label><Input name="last_name" value={formData.last_name} onChange={handleChange} disabled={!isEditing} /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>{isRtl ? 'التخصص' : 'Specialty'}</Label><Input name="specialty" value={formData.specialty} onChange={handleChange} disabled={!isEditing} /></div>
                            <div><Label>{isRtl ? 'سعر الكشف' : 'Price'}</Label><Input name="consultation_price" type="number" value={formData.consultation_price} onChange={handleChange} disabled={!isEditing} /></div>
                        </div>
                        <div><Label>{isRtl ? 'رقم الهاتف' : 'Phone'}</Label><Input name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} /></div>
                        <div>
                            <Label className="flex items-center gap-2"><User className="h-4 w-4" />{isRtl ? 'نبذة عني' : 'About Me'}</Label>
                            <textarea name="bio" className="w-full p-3 border rounded-lg resize-none min-h-[80px] mt-1" value={formData.bio} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div><Label className="flex items-center gap-2"><Building className="h-4 w-4" />{isRtl ? 'عنوان العيادة' : 'Clinic Address'}</Label><Input name="location" value={formData.location} onChange={handleChange} disabled={!isEditing} placeholder={isRtl ? 'حي الزهور، الموصل' : 'Al-Zuhoor, Mosul'} className="mt-1" /></div>
                        <div><Label className="flex items-center gap-2"><MapPin className="h-4 w-4" />{isRtl ? 'نقطة دالة' : 'Landmark'}</Label><Input name="landmark" value={formData.landmark} onChange={handleChange} disabled={!isEditing} placeholder={isRtl ? 'مقابل جامع...' : 'Near mosque...'} className="mt-1" /></div>

                        <div>
                            <Label className="flex items-center gap-2 mb-2"><Map className="h-4 w-4" />{isRtl ? 'الموقع على الخريطة' : 'Map Location'}</Label>
                            <MapPicker latitude={formData.latitude} longitude={formData.longitude} onLocationSelect={handleLocationSelect} readonly={!isEditing} isRtl={isRtl} />
                        </div>

                        <div className="pt-4 border-t">
                            <Label className="block mb-3 text-lg font-semibold">{isRtl ? 'روابط التواصل الاجتماعي' : 'Social Media Links'}</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><Label>Facebook</Label><Input name="facebook" placeholder="https://facebook.com/..." value={formData.facebook} onChange={handleChange} disabled={!isEditing} dir="ltr" /></div>
                                <div><Label>Instagram</Label><Input name="instagram" placeholder="https://instagram.com/..." value={formData.instagram} onChange={handleChange} disabled={!isEditing} dir="ltr" /></div>
                                <div><Label>TikTok</Label><Input name="tiktok" placeholder="https://tiktok.com/..." value={formData.tiktok} onChange={handleChange} disabled={!isEditing} dir="ltr" /></div>
                                <div><Label>Twitter (X)</Label><Input name="twitter" placeholder="https://x.com/..." value={formData.twitter} onChange={handleChange} disabled={!isEditing} dir="ltr" /></div>
                                <div><Label>YouTube</Label><Input name="youtube" placeholder="https://youtube.com/..." value={formData.youtube} onChange={handleChange} disabled={!isEditing} dir="ltr" /></div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            {isEditing ? (
                                <>
                                    <Button className="flex-1 gap-2" onClick={handleSave} disabled={updateDoctorMutation.isPending}>
                                        {updateDoctorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {isRtl ? 'حفظ' : 'Save'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsEditing(false)}>{isRtl ? 'إلغاء' : 'Cancel'}</Button>
                                </>
                            ) : (
                                <Button className="flex-1" onClick={() => setIsEditing(true)}>{isRtl ? 'تعديل البيانات' : 'Edit Profile'}</Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default DoctorProfilePage
