import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { User, Camera, Save } from 'lucide-react'

const ProfilePage = () => {
    const { i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'
    const [isEditing, setIsEditing] = useState(false)
    const fileInputRef = useRef(null)
    const queryClient = useQueryClient()

    // Fetch user profile
    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const res = await api.get('auth/me/')
            return res.data
        }
    })

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: ''
    })

    React.useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                phone: user.phone || ''
            })
        }
    }, [user])

    // Update profile mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const formDataToSend = new FormData()
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    formDataToSend.append(key, data[key])
                }
            })
            const res = await api.patch('auth/profile/', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            return res.data
        },
        onSuccess: () => {
            toast.success(isRtl ? 'تم حفظ التغييرات' : 'Profile updated!')
            queryClient.invalidateQueries(['currentUser'])
            setIsEditing(false)
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to update profile')
        }
    })

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            updateMutation.mutate({ profile_picture: file })
        }
    }

    const handleSave = () => {
        updateMutation.mutate(formData)
    }

    if (isLoading) {
        return (
            <Layout>
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </Layout>
        )
    }

    const profilePicUrl = user?.profile_picture_url || (user?.profile_picture ? `http://localhost:8000${user.profile_picture}` : null)

    return (
        <Layout>
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">{isRtl ? 'حسابي' : 'My Profile'}</h1>
                    <p className="text-muted-foreground">{isRtl ? 'عرض وتعديل معلوماتك' : 'View and edit your information'}</p>
                </div>

                {/* Profile Card */}
                <Card>
                    <CardHeader className="text-center">
                        {/* Profile Picture with Upload */}
                        <div className="mx-auto relative group">
                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold overflow-hidden">
                                {profilePicUrl ? (
                                    <img src={profilePicUrl} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    user?.first_name?.charAt(0) || 'U'
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>
                        <CardTitle className="mt-4">
                            {user?.first_name} {user?.last_name}
                        </CardTitle>
                        <CardDescription className="capitalize">
                            {user?.role?.toLowerCase() || 'User'} • {user?.email}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{isRtl ? 'الاسم الأول' : 'First Name'}</Label>
                                    <Input
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{isRtl ? 'الاسم الأخير' : 'Last Name'}</Label>
                                    <Input
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{isRtl ? 'رقم الهاتف' : 'Phone Number'}</Label>
                                <Input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                    placeholder="+966 5XX XXX XXXX"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{isRtl ? 'البريد الإلكتروني' : 'Email'}</Label>
                                <Input
                                    value={user?.email || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            {isEditing ? (
                                <>
                                    <Button
                                        className="flex-1 gap-2"
                                        onClick={handleSave}
                                        disabled={updateMutation.isPending}
                                    >
                                        <Save className="h-4 w-4" />
                                        {updateMutation.isPending
                                            ? (isRtl ? 'جاري الحفظ...' : 'Saving...')
                                            : (isRtl ? 'حفظ' : 'Save')}
                                    </Button>
                                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                                        {isRtl ? 'إلغاء' : 'Cancel'}
                                    </Button>
                                </>
                            ) : (
                                <Button className="flex-1" onClick={() => setIsEditing(true)}>
                                    {isRtl ? 'تعديل المعلومات' : 'Edit Profile'}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default ProfilePage
