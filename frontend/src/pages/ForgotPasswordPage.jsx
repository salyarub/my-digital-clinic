import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import api from '@/lib/axios'
import { toast } from 'sonner'
import Layout from '@/components/layout/Layout'

const ForgotPasswordPage = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email) {
            toast.error('يرجى إدخال البريد الإلكتروني')
            return
        }

        setIsLoading(true)
        try {
            await api.post('auth/forgot-password/', { email })
            setIsSent(true)
        } catch (error) {
            console.error(error)
            // Even on error, we might show "sent" to prevent email enumeration,
            // or just show generic error if it's a network issue.
            toast.error('حدث درر أثناء إرسال طلب استعادة كلمة المرور')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Layout hideSidebar hideNavigation>
            <div className="flex min-h-[80vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center space-y-2">
                        <CardTitle className="text-2xl">هل نسيت كلمة المرور؟</CardTitle>
                        <CardDescription>
                            أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSent ? (
                            <div className="text-center space-y-4 py-6 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-16 w-16 mx-auto" />
                                <h3 className="text-xl font-medium">تم الإرسال بنجاح</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    إذا كان هذا البريد الإلكتروني مسجلاً لدينا، فستتلقى رسالة تحتوي على رابط إعادة التعيين قريباً.
                                </p>
                                <Button variant="outline" className="w-full mt-6 text-foreground" onClick={() => navigate('/login')}>
                                    العودة لتسجيل الدخول
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">البريد الإلكتروني</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        dir="ltr"
                                    />
                                </div>

                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                                </Button>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full gap-2 text-muted-foreground"
                                    onClick={() => navigate('/login')}
                                >
                                    <ArrowRight className="h-4 w-4" /> عودة لتسجيل الدخول
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default ForgotPasswordPage
