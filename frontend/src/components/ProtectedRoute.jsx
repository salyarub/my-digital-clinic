import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

// Basic protection - just checks if logged in
const ProtectedRoute = ({ children }) => {
    const { loading } = useAuth()
    const location = useLocation()
    const token = localStorage.getItem('access_token')

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return children
}

// Role-specific protection
export const DoctorRoute = ({ children }) => {
    const token = localStorage.getItem('access_token')

    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const res = await api.get('auth/me/')
            return res.data
        },
        enabled: !!token
    })

    if (!token) {
        return <Navigate to="/login" replace />
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user?.role !== 'DOCTOR') {
        // Redirect based on role
        if (user?.role === 'SECRETARY') return <Navigate to="/secretary" replace />
        if (user?.role === 'PATIENT') return <Navigate to="/patient" replace />
        return <Navigate to="/login" replace />
    }

    return children
}

export const PatientRoute = ({ children }) => {
    const token = localStorage.getItem('access_token')

    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const res = await api.get('auth/me/')
            return res.data
        },
        enabled: !!token
    })

    if (!token) {
        return <Navigate to="/login" replace />
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user?.role !== 'PATIENT') {
        // Redirect based on role
        if (user?.role === 'SECRETARY') return <Navigate to="/secretary" replace />
        if (user?.role === 'DOCTOR') return <Navigate to="/doctor" replace />
        return <Navigate to="/login" replace />
    }

    return children
}

export const SecretaryRoute = ({ children }) => {
    const token = localStorage.getItem('access_token')

    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const res = await api.get('auth/me/')
            return res.data
        },
        enabled: !!token
    })

    if (!token) {
        return <Navigate to="/login" replace />
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user?.role !== 'SECRETARY') {
        // Redirect based on role
        if (user?.role === 'DOCTOR') return <Navigate to="/doctor" replace />
        if (user?.role === 'PATIENT') return <Navigate to="/patient" replace />
        return <Navigate to="/login" replace />
    }

    return children
}

export const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('access_token')

    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const res = await api.get('auth/me/')
            return res.data
        },
        enabled: !!token
    })

    if (!token) {
        return <Navigate to="/login" replace />
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (user?.role !== 'ADMIN') {
        // Redirect based on role
        if (user?.role === 'DOCTOR') return <Navigate to="/doctor" replace />
        if (user?.role === 'PATIENT') return <Navigate to="/patient" replace />
        if (user?.role === 'SECRETARY') return <Navigate to="/secretary" replace />
        return <Navigate to="/login" replace />
    }

    return children
}

export default ProtectedRoute
