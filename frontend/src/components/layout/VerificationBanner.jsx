import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Info, UploadCloud, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import api from '@/lib/axios'

const VerificationBanner = () => {
    const { user, login } = useAuth()
    const { t, i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'

    const [isUploading, setIsUploading] = useState(false)
    const [file, setFile] = useState(null)
    const [open, setOpen] = useState(false)

    // Only show for doctors
    if (!user || user.role !== 'DOCTOR' || !user.profile) return null

    // If verified, NEVER show the banner (handles older verified doctors who might have PENDING status defaulting)
    if (user.profile.is_verified) return null

    // Fallback safeguard
    if (!user.profile.verification_status) return null

    const status = user.profile.verification_status
    const isPending = status === 'PENDING'
    const isRejected = status === 'REJECTED'

    const handleUpload = async () => {
        if (!file) {
            toast.error(isRtl ? 'يرجى اختيار ملف الوثيقة' : 'Please select a document file')
            return
        }

        setIsUploading(true)
        const formData = new FormData()
        formData.append('license_image', file)

        try {
            const response = await api.patch('doctors/profile/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            toast.success(isRtl ? 'تم رفع الوثيقة بنجاح، بانتظار المراجعة' : 'Document uploaded successfully, pending review')
            setOpen(false)
            setFile(null)

            // Wait a moment then refresh page to get updated user profile
            setTimeout(() => {
                window.location.reload()
            }, 1000)

        } catch (error) {
            console.error(error)
            toast.error(isRtl ? 'حدث خطأ أثناء الرفع' : 'Failed to upload document')
        } finally {
            setIsUploading(false)
        }
    }

    const uploadModal = (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant={isRejected ? "destructive" : "outline"} className="shrink-0 gap-2 whitespace-nowrap bg-white text-current hover:bg-black/5 dark:bg-black/20 dark:hover:bg-black/40 border-current/20">
                    <UploadCloud className="h-4 w-4" />
                    {isRtl ? 'إعادة الرفع' : 'Re-upload'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isRtl ? 'إعادة رفع وثيقة المزاولة' : 'Re-upload Practice License'}</DialogTitle>
                    <DialogDescription>
                        {isRtl
                            ? 'يرجى رفع صورة واضحة لوثيقة مزاولة المهنة الخاصة بك ليتم مراجعتها مجدداً.'
                            : 'Please upload a clear image of your practice license to be reviewed again.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="license">{isRtl ? 'ملف الوثيقة' : 'Document File'}</Label>
                        <input
                            id="license"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="w-full gap-2"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                        {isRtl ? 'تأكيد وإرسال' : 'Confirm & Submit'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )

    if (isPending) {
        return (
            <div className="w-full bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800">
                <div className="container py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-yellow-800 dark:text-yellow-200">
                        <Info className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">
                            {isRtl
                                ? 'حسابك قيد المراجعة. نرجو الانتظار حتى يتم تدقيق بياناتك من قبل الإدارة.'
                                : 'Your account is under review. Please wait until your details are verified by the administration.'}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (isRejected) {
        return (
            <div className="w-full bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
                <div className="container py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold">
                                {isRtl
                                    ? 'تم رفض وثيقتك. يرجى رفع وثيقة جديدة للتحقق.'
                                    : 'Your document was rejected. Please upload a new document for verification.'}
                            </p>
                            {user.profile.rejection_reason && (
                                <p className="text-xs mt-1 opacity-90">
                                    {isRtl ? 'السبب: ' : 'Reason: '}
                                    {user.profile.rejection_reason}
                                </p>
                            )}
                        </div>
                    </div>

                    {uploadModal}
                </div>
            </div>
        )
    }

    return null
}

export default VerificationBanner
