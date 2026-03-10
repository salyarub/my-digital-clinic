import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Send, Edit, ArrowRight, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/axios'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'

const UnverifiedAccountPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const emailParam = searchParams.get('email') || ''

    const [isChangeMode, setIsChangeMode] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Cooldown and Polling states
    const [cooldown, setCooldown] = useState(0) // Seconds remaining
    const [isVerified, setIsVerified] = useState(false)

    if (!emailParam) {
        return (
            <Layout hideSidebar hideNavigation>
                <div className="flex min-h-[80vh] items-center justify-center p-4">
                    <Card className="w-full max-w-md text-center py-6">
                        <CardContent className="space-y-4">
                            <p className="text-lg font-medium text-red-600">صفحة غير صالحة</p>
                            <Button className="w-full mt-4" onClick={() => navigate('/login')}>العودة لتسجيل الدخول</Button>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        )
    }

    // Polling logic
    useEffect(() => {
        if (!emailParam || isVerified) return

        let pollInterval = setInterval(async () => {
            try {
                const res = await api.get(`auth/check-verification-status/?email=${encodeURIComponent(emailParam)}`)
                if (res.data.is_verified) {
                    setIsVerified(true)
                    clearInterval(pollInterval)
                    toast.success('تم تأكيد حسابك بنجاح! جاري التوجيه لحسابك...')
                    setTimeout(() => {
                        navigate('/login') // Redirect to login, which will automatically log them in or ask for credentials
                    }, 2000)
                }
            } catch (error) {
                // Ignore 404s or network errors during polling
            }
        }, 5000) // Poll every 5 seconds

        return () => clearInterval(pollInterval)
    }, [emailParam, isVerified, navigate])

    // Cooldown timer logic
    useEffect(() => {
        if (cooldown <= 0) return

        const timer = setInterval(() => {
            setCooldown(prev => prev - 1)
        }, 1000)

        return () => clearInterval(timer)
    }, [cooldown])

    const formatCooldown = (seconds) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    const handleResend = async () => {
        if (cooldown > 0) return

        setIsLoading(true)
        try {
            await api.post('auth/resend-verification/', { email: emailParam })
            toast.success('تم إرسال رابط التأكيد بنجاح. يرجى التحقق من بريدك الإلكتروني.')
            setCooldown(120) // 120 seconds = 2 minutes
        } catch (error) {
            toast.error(error.response?.data?.error || 'حدث خطأ أثناء إرسال الرابط')
        } finally {
            setIsLoading(false)
        }
    }

    const handleChangeEmail = async (e) => {
        e.preventDefault()
        if (!newEmail || !password) {
            toast.error('يرجى تعبئة جميع الحقول')
            return
        }

        setIsLoading(true)
        try {
            await api.post('auth/change-unverified-email/', {
                old_email: emailParam,
                new_email: newEmail,
                password: password
            })
            toast.success('تم تغيير البريد الإلكتروني وإرسال رابط تأكيد جديد')
            navigate(`/unverified-account?email=${encodeURIComponent(newEmail)}`)
            setIsChangeMode(false)
            setPassword('')
        } catch (error) {
            toast.error(error.response?.data?.error || 'حدث خطأ أثناء تغيير البريد الإلكتروني')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Layout hideSidebar hideNavigation>
            <div className="flex min-h-[80vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center space-y-2">
                        <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto" />
                        <CardTitle className="text-2xl">حساب غير مؤكد</CardTitle>
                        <CardDescription>
                            يبدو أنك لم تقم بتأكيد بريدك الإلكتروني بعد. لحماية حسابك، يجب النقر على الرابط المرسل إليك.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {!isChangeMode ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded-lg text-center text-sm">
                                    البريد المسجل: <strong>{emailParam}</strong>
                                </div>

                                <Button
                                    className="w-full gap-2"
                                    onClick={handleResend}
                                    disabled={isLoading || cooldown > 0}
                                >
                                    {cooldown > 0 ? (
                                        `إعادة إرسال بعد (${formatCooldown(cooldown)})`
                                    ) : (
                                        <><Send className="h-4 w-4" /> {isLoading ? 'جاري الإرسال...' : 'إعادة إرسال رابط التأكيد'}</>
                                    )}
                                </Button>

                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-muted"></div>
                                    <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm">أو</span>
                                    <div className="flex-grow border-t border-muted"></div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full gap-2"
                                    onClick={() => setIsChangeMode(true)}
                                >
                                    <Edit className="h-4 w-4" /> تغيير البريد الإلكتروني
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleChangeEmail} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newEmail">البريد الإلكتروني الجديد</Label>
                                    <Input
                                        id="newEmail"
                                        type="email"
                                        placeholder="new@example.com"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        required
                                        dir="ltr"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">كلمة المرور الحالية (للتأكيد)</Label>
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
                                    <p className="text-xs text-muted-foreground mt-1">يجب إدخال كلمة المرور للتأكد من هويتك</p>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="submit" className="flex-1" disabled={isLoading}>
                                        {isLoading ? 'جاري التحديث...' : 'تحديث وإرسال'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsChangeMode(false)}
                                    >
                                        إلغاء
                                    </Button>
                                </div>
                            </form>
                        )}

                        <div className="pt-4 text-center">
                            <Button
                                variant="ghost"
                                className="gap-2 text-muted-foreground"
                                onClick={() => navigate('/login')}
                            >
                                <ArrowRight className="h-4 w-4" /> عودة لتسجيل الدخول
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default UnverifiedAccountPage
