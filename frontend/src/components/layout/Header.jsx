import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import {
    Globe,
    User,
    Search,
    Calendar,
    Star,
    Bell,
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    Users,
    Clock,
    Activity,
    Moon,
    Sun,
    Shield
} from 'lucide-react'

const Header = () => {
    const { i18n } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { theme, toggleTheme } = useTheme()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const isRtl = i18n.language === 'ar'
    const token = localStorage.getItem('access_token')

    const { user, logout } = useAuth()

    // Fallback if user is not fully loaded from context yet, though AuthProvider handles initial load
    // But since we use token to check isLoggedIn, we should rely on user object presence
    const isLoggedIn = !!token && !!user
    const isDoctor = user?.role === 'DOCTOR'
    const isPatient = user?.role === 'PATIENT'
    const isSecretary = user?.role === 'SECRETARY'
    const isAdmin = user?.role === 'ADMIN'
    const permissions = user?.permissions || []

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en'
        i18n.changeLanguage(newLang)
    }

    useEffect(() => {
        document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = i18n.language
    }, [i18n.language])

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        navigate('/login')
    }

    // Navigation items based on role
    const getNavItems = () => {
        // Admin navigation - exclusive to admin only
        if (isAdmin) {
            return [
                { path: '/admin', icon: Shield, label: isRtl ? 'لوحة التحكم' : 'Dashboard' },
            ]
        }
        if (isDoctor) {
            return [
                { path: '/doctor', icon: LayoutDashboard, label: isRtl ? 'لوحة التحكم' : 'Dashboard' },
                { path: '/doctor/schedule', icon: Calendar, label: isRtl ? 'الجدول' : 'Calendar' },
                { path: '/doctor/availability', icon: Clock, label: isRtl ? 'الدوام' : 'Availability' },
                { path: '/doctor/ratings', icon: Star, label: isRtl ? 'التقييمات' : 'Ratings' },
                { path: '/notifications', icon: Bell, label: isRtl ? 'الإشعارات' : 'Notifications' },
                { path: '/doctor/staff', icon: Users, label: isRtl ? 'الموظفين' : 'Staff' },
                { path: '/doctor/logs', icon: Activity, label: isRtl ? 'السجلات' : 'Logs' },
                { path: '/doctor/profile', icon: User, label: isRtl ? 'حسابي' : 'Profile' },
            ]
        }
        if (isSecretary) {
            const secretaryNav = [
                { path: '/secretary', icon: LayoutDashboard, label: isRtl ? 'لوحة التحكم' : 'Dashboard' },
            ]
            // Show schedule if secretary has relevant permissions
            if (permissions.includes('view_schedule') || permissions.includes('manage_bookings') || permissions.includes('patient_checkin')) {
                secretaryNav.push({ path: '/secretary/schedule', icon: Calendar, label: isRtl ? 'الجدول' : 'Schedule' })
            }
            // Only show notifications if secretary has permission
            if (permissions.includes('receive_notifications')) {
                secretaryNav.push({ path: '/notifications', icon: Bell, label: isRtl ? 'الإشعارات' : 'Notifications' })
            }
            secretaryNav.push({ path: '/profile', icon: User, label: isRtl ? 'حسابي' : 'Profile' })
            return secretaryNav
        }
        // Patient navigation
        return [
            { path: '/patient', icon: Search, label: isRtl ? 'البحث' : 'Search' },
            { path: '/my-bookings', icon: Calendar, label: isRtl ? 'حجوزاتي' : 'Bookings' },
            { path: '/ratings', icon: Star, label: isRtl ? 'التقييمات' : 'Ratings' },
            { path: '/notifications', icon: Bell, label: isRtl ? 'الإشعارات' : 'Notifications' },
            { path: '/profile', icon: User, label: isRtl ? 'حسابي' : 'Profile' },
        ]
    }

    const getRoleBadge = () => {
        if (isAdmin) return isRtl ? 'مسؤول' : 'Admin'
        if (isDoctor) return isRtl ? 'طبيب' : 'Doctor'
        if (isSecretary) return isRtl ? 'سكرتير' : 'Secretary'
        return isRtl ? 'مريض' : 'Patient'
    }

    const getHomeRoute = () => {
        if (isAdmin) return '/admin'
        if (isDoctor) return '/doctor'
        if (isSecretary) return '/secretary'
        return '/patient'
    }

    const navItems = getNavItems()
    const isActive = (path) => location.pathname === path

    return (
        <header className="fixed top-0 w-full z-50 glass-nav transition-all duration-300">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo */}
                <Link
                    to={isLoggedIn ? getHomeRoute() : '/'}
                    className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight"
                >
                    {isRtl ? 'عيادتك' : 'Ayadtuk'}
                    {isLoggedIn && (
                        <span className="text-xs font-normal px-2 py-0.5 bg-primary/10 rounded-full">
                            {getRoleBadge()}
                        </span>
                    )}
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {isLoggedIn ? (
                        <>
                            {navItems.map((item) => (
                                <Link key={item.path} to={item.path}>
                                    <Button
                                        variant={isActive(item.path) ? "default" : "ghost"}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span className="hidden lg:inline">{item.label}</span>
                                    </Button>
                                </Link>
                            ))}

                            <div className="h-6 w-px bg-border mx-2" />

                            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-2">
                                <Globe className="h-4 w-4" />
                                <span className="uppercase">{i18n.language}</span>
                            </Button>

                            <Button variant="ghost" size="sm" onClick={toggleTheme} className="gap-2">
                                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button>

                            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive hover:text-destructive">
                                <LogOut className="h-4 w-4" />
                                <span className="hidden lg:inline">{isRtl ? 'خروج' : 'Logout'}</span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-2">
                                <Globe className="h-4 w-4" />
                                <span className="uppercase">{i18n.language}</span>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={toggleTheme}>
                                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button>
                            <Link to="/login">
                                <Button variant="ghost" size="sm">{isRtl ? 'دخول' : 'Login'}</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm">{isRtl ? 'تسجيل جديد' : 'Sign Up'}</Button>
                            </Link>
                        </>
                    )}
                </nav>

                {/* Mobile Menu Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-background border-t shadow-lg">
                    <div className="container py-4 space-y-2">
                        {isLoggedIn ? (
                            <>
                                {/* Role Badge */}
                                <div className="px-4 py-2 bg-primary/10 rounded-lg text-center mb-4">
                                    <span className="text-sm font-medium">
                                        {isDoctor ? (isRtl ? '👨‍⚕️ حساب طبيب' : '👨‍⚕️ Doctor Account') :
                                            isSecretary ? (isRtl ? '📋 حساب سكرتير' : '📋 Secretary Account') :
                                                (isRtl ? '👤 حساب مريض' : '👤 Patient Account')}
                                    </span>
                                </div>

                                <div className="pt-2">
                                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleLanguage}>
                                        <Globe className="h-5 w-5" />
                                        {isRtl ? 'English' : 'العربية'}
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start gap-3" onClick={toggleTheme}>
                                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                        {theme === 'dark' ? (isRtl ? 'الوضع الفاتح' : 'Light Mode') : (isRtl ? 'الوضع الداكن' : 'Dark Mode')}
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={handleLogout}>
                                        <LogOut className="h-5 w-5" />
                                        {isRtl ? 'تسجيل خروج' : 'Logout'}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full">{isRtl ? 'دخول' : 'Login'}</Button>
                                </Link>
                                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                                    <Button className="w-full">{isRtl ? 'تسجيل جديد' : 'Sign Up'}</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}

export default Header
