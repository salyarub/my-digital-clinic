import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '@/lib/axios'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState('')

    if (!token) {
        return (
            <Layout hideSidebar hideNavigation>
                <div className="flex min-h-[80vh] items-center justify-center p-4">
                    <Card className="w-full max-w-md text-center py-6">
                        <CardContent className="space-y-4">
                            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
                            <p className="text-lg font-medium text-red-600">الرابط غير صالح</p>
                            <p className="text-muted-foreground text-sm">رمز إعادة تعيين كلمة المرور مفقود.</p>
                            <Button className="w-full mt-4" onClick={() => navigate('/login')}>تسجيل الدخول</Button>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password.length < 8) {
            setError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
            return
        }

        if (password !== confirmPassword) {
            setError('كلمات المرور غير متطابقة')
            return
        }

        setIsLoading(true)
        try {
            await api.post('auth/reset-password/', { token, new_password: password })
            setIsSuccess(true)
            toast.success('تم تغيير كلمة المرور بنجاح')
        } catch (error) {
            console.error(error)
            setError(error.response?.data?.error || 'الرابط غير صالح أو منتهي الصلاحية')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Layout hideSidebar hideNavigation>
            <div className="flex min-h-[80vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-2xl">تغيير كلمة المرور</CardTitle>
                        <CardDescription>
                            أدخل كلمة المرور الجديدة لحسابك
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSuccess ? (
                            <div className="text-center space-y-4 py-6 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-16 w-16 mx-auto" />
                                <h3 className="text-xl font-medium">تم بنجاح</h3>
                                <p className="text-sm text-muted-foreground mt-2 text-foreground">
                                    لقد تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.
                                </p>
                                <Button className="w-full mt-6" onClick={() => navigate('/login')}>
                                    الانتقال لتسجيل الدخول
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm border border-red-200 dark:border-red-800">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="password">كلمة المرور الجديدة</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            dir="ltr"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        dir="ltr"
                                    />
                                </div>

                                <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                                    {isLoading ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default ResetPasswordPage
