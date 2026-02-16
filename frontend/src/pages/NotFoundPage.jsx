import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Home, ArrowRight, ArrowLeft } from 'lucide-react'

const NotFoundPage = () => {
    const { i18n } = useTranslation()
    const isRtl = i18n.language === 'ar'

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="text-8xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                    404
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    {isRtl ? 'الصفحة غير موجودة' : 'Page Not Found'}
                </h1>
                <p className="text-muted-foreground mb-8 max-w-md">
                    {isRtl
                        ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
                        : 'Sorry, the page you are looking for does not exist or has been moved.'}
                </p>
                <Link to="/">
                    <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <Home className="h-5 w-5" />
                        {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
                        {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                </Link>
            </div>
        </Layout>
    )
}

export default NotFoundPage
