import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { User, Stethoscope } from 'lucide-react'

const RegisterPage = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: { role: 'PATIENT' } // Default
    })
    const [isLoading, setIsLoading] = useState(false)
    const selectedRole = watch('role')

    const onSubmit = async (data) => {
        setIsLoading(true)
        try {
            await api.post('auth/register/', data)
            toast.success("Account created successfully! Please login.")
            navigate('/login')
        } catch (error) {
            console.error("Registration Error:", error.response?.data || error)

            // Extract detailed error message
            const errorData = error.response?.data
            let msg = "Registration failed."

            if (errorData) {
                if (typeof errorData === 'string') {
                    msg = errorData
                } else if (errorData.error) {
                    msg = errorData.error
                } else if (errorData.detail) {
                    msg = errorData.detail
                } else if (errorData.email) {
                    msg = `Email: ${errorData.email}`
                } else if (errorData.password) {
                    msg = `Password: ${errorData.password}`
                } else {
                    // Show first field error
                    const firstKey = Object.keys(errorData)[0]
                    if (firstKey && Array.isArray(errorData[firstKey])) {
                        msg = `${firstKey}: ${errorData[firstKey][0]}`
                    } else if (firstKey) {
                        msg = `${firstKey}: ${errorData[firstKey]}`
                    }
                }
            } else if (error.message) {
                msg = error.message
            }

            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Layout>
            <div className="flex items-center justify-center min-h-[70vh]">
                <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
                        <CardDescription className="text-center">Join our digital health platform</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                            {/* Role Selection */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div
                                    className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 transition-all ${selectedRole === 'PATIENT' ? 'border-primary bg-primary/5' : 'border-muted hover:border-gray-300'}`}
                                    onClick={() => setValue('role', 'PATIENT')}
                                >
                                    <User className="h-6 w-6" />
                                    <span className="font-semibold text-sm">Patient</span>
                                </div>
                                <div
                                    className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col items-center gap-2 transition-all ${selectedRole === 'DOCTOR' ? 'border-primary bg-primary/5' : 'border-muted hover:border-gray-300'}`}
                                    onClick={() => setValue('role', 'DOCTOR')}
                                >
                                    <Stethoscope className="h-6 w-6" />
                                    <span className="font-semibold text-sm">Doctor</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input {...register('first_name', { required: true })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input {...register('last_name', { required: true })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" {...register('email', { required: true })} />
                            </div>

                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input type="password" {...register('password', { required: true, minLength: 6 })} />
                            </div>

                            <Button className="w-full" size="lg" disabled={isLoading}>
                                {isLoading ? "Creating Account..." : "Register"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}

export default RegisterPage
