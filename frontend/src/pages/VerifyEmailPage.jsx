import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import api from '@/lib/axios'
import Layout from '@/components/layout/Layout'

const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const token = searchParams.get('token')

    const [status, setStatus] = useState('loading') // loading, success, error
    const [message, setMessage] = useState('')

    // Prevent strict mode double execution from triggering double API calls
    const isCalledRef = useRef(false)

    useEffect(() => {
        if (!token) {
            setStatus('error')
            setMessage('لم يتم توفير رمز التحقق')
            return
        }

        if (isCalledRef.current) return
        isCalledRef.current = true

        const verifyEmail = async () => {
            try {
                const res = await api.post('auth/verify-email/', { token })
                setStatus('success')
                setMessage(res.data.message || 'تم تأكيد البريد الإلكتروني بنجاح')
            } catch (error) {
                setStatus('error')
                setMessage(error.response?.data?.error || 'رمز التحقق غير صالح أو منتهي الصلاحية')
            }
        }

        verifyEmail()
    }, [token])

    return (
        <Layout hideSidebar hideNavigation>
            <div className="flex min-h-[80vh] items-center justify-center p-4">
                <Card className="w-full max-w-md text-center py-6">
                    <CardHeader>
                        <CardTitle className="text-2xl">تأكيد البريد الإلكتروني</CardTitle>
                        <CardDescription>التحقق من ملكية الحساب</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 flex flex-col items-center">
                        {status === 'loading' && (
                            <>
                                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                                <p className="text-muted-foreground">جاري التحقق من الرمز، يرجى الانتظار...</p>
                            </>
                        )}

                        {status === 'success' && (
                            <>
                                <CheckCircle2 className="h-20 w-20 text-green-500" />
                                <p className="text-lg font-medium text-green-700 dark:text-green-400">{message}</p>
                                <Button className="w-full mt-4" onClick={() => navigate('/login')}>
                                    الانتقال لتسجيل الدخول
                                </Button>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <XCircle className="h-20 w-20 text-red-500" />
                                <p className="text-lg font-medium text-red-700 dark:text-red-400">{message}</p>
                                <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/login')}>
                                    العودة لتسجيل الدخول
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default VerifyEmailPage
