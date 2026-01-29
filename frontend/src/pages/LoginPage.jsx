import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import api from '@/lib/axios'
import { toast } from 'sonner'

const LoginPage = () => {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const { login, user } = useAuth() // Use login & user from context
    const { register, handleSubmit, formState: { errors } } = useForm()
    const [isLoading, setIsLoading] = useState(false)

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const userRole = user.role
            if (userRole === 'ADMIN') navigate('/admin')
            else if (userRole === 'DOCTOR') navigate('/doctor')
            else if (userRole === 'PATIENT') navigate('/patient')
            else if (userRole === 'SECRETARY') navigate('/secretary')
            else navigate('/')
        }
    }, [user, navigate])

    // Check if current language is RTL (Arabic)
    const isRtl = i18n.language === 'ar'

    // Helper function to get translated error message
    const getTranslatedError = (errorData, originalError) => {
        // Check for common error patterns and return translated version
        if (errorData?.detail) {
            const detail = errorData.detail.toLowerCase()
            if (detail.includes('no active account') || detail.includes('given credentials')) {
                return t('login.noActiveAccount')
            }
            if (detail.includes('inactive') || detail.includes('disabled')) {
                return t('login.accountInactive')
            }
        }

        if (errorData?.error) {
            const error = errorData.error.toLowerCase()
            if (error.includes('credentials') || error.includes('password') || error.includes('invalid')) {
                return t('login.invalidCredentials')
            }
        }

        // Check for network errors
        if (!originalError.response) {
            return t('login.networkError')
        }

        // Default error message
        return t('login.invalidCredentials')
    }

    const onSubmit = async (data) => {
        setIsLoading(true)
        try {
            // Use context login which handles token storage, state update, and cache clearing
            const user = await login(data.email, data.password)

            toast.success(t('login.welcomeBack'))

            // Role-based redirect
            const userRole = user.role
            if (userRole === 'ADMIN') {
                navigate('/admin')
            } else if (userRole === 'DOCTOR') {
                navigate('/doctor')
            } else if (userRole === 'PATIENT') {
                navigate('/patient')
            } else if (userRole === 'SECRETARY') {
                navigate('/secretary')
            } else {
                navigate('/') // Default to home
            }
        } catch (error) {
            console.error("Login Error:", error.response?.data || error)
            const errorData = error.response?.data
            const msg = getTranslatedError(errorData, error)
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Layout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">{t('login.title')}</CardTitle>
                        <CardDescription className="text-center">{t('login.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('login.email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="doctor@example.com"
                                    {...register('email', { required: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">{t('login.password')}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register('password', { required: true })}
                                />
                            </div>
                            <Button className="w-full" disabled={isLoading}>
                                {isLoading ? t('login.loggingIn') : t('login.loginButton')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default LoginPage

