import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { ExternalLink, Navigation, Link, Check, Loader2 } from 'lucide-react'

// Map Picker component - supports short Google Maps links via backend
const MapPicker = ({ latitude, longitude, onLocationSelect, readonly = false, isRtl }) => {
    // Default to Mosul if no location set
    const defaultLat = 36.3350
    const defaultLng = 43.1189
    const [mapsLink, setMapsLink] = useState('')
    const [extractedLat, setExtractedLat] = useState(parseFloat(latitude) || defaultLat)
    const [extractedLng, setExtractedLng] = useState(parseFloat(longitude) || defaultLng)
    const [isExtracted, setIsExtracted] = useState(false)
    const [isResolving, setIsResolving] = useState(false)

    useEffect(() => {
        if (latitude !== undefined && latitude !== null) setExtractedLat(parseFloat(latitude))
        if (longitude !== undefined && longitude !== null) setExtractedLng(parseFloat(longitude))
    }, [latitude, longitude])

    const displayLat = extractedLat
    const displayLng = extractedLng
    const hasLocation = latitude && longitude

    const openInGoogleMaps = () => {
        window.open(`https://www.google.com/maps?q=${displayLat},${displayLng}`, '_blank')
    }

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            toast.info(isRtl ? 'جاري تحديد الموقع...' : 'Getting location...')
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = parseFloat(position.coords.latitude.toFixed(6))
                    const lng = parseFloat(position.coords.longitude.toFixed(6))
                    setExtractedLat(lat)
                    setExtractedLng(lng)
                    setIsExtracted(true)
                    onLocationSelect?.(lat, lng)
                    toast.success(isRtl ? '✅ تم تحديد موقعك!' : '✅ Location set!')
                },
                () => toast.error(isRtl ? 'فشل - فعّل GPS' : 'Failed - Enable GPS'),
                { enableHighAccuracy: true }
            )
        }
    }

    // Check if link is a short Google Maps link
    const isShortLink = (url) => {
        return url.includes('goo.gl') || url.includes('maps.app.goo.gl') || url.includes('g.co')
    }

    // Extract coordinates from full Google Maps URL
    const extractCoordsFromUrl = (url) => {
        let lat = null, lng = null

        const patterns = [
            /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,           // @36.335,43.118
            /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,       // q=36.335,43.118
            /\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/,         // /@36.335,43.118,
            /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,        // !3d36.335!4d43.118
            /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,          // ll=36.335,43.118
            /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/        // direct coords
        ]

        for (const pattern of patterns) {
            const match = url.match(pattern)
            if (match) {
                lat = parseFloat(match[1])
                lng = parseFloat(match[2])
                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) break
                lat = lng = null
            }
        }
        return { lat, lng }
    }

    // Resolve short link via backend API
    const resolveShortLink = async (url) => {
        setIsResolving(true)
        try {
            const response = await api.post('resolve-maps-link/', { url })
            const { latitude: lat, longitude: lng } = response.data
            setExtractedLat(lat)
            setExtractedLng(lng)
            setIsExtracted(true)
            onLocationSelect?.(lat, lng)
            toast.success(isRtl ? `✅ تم! (${lat.toFixed(4)}, ${lng.toFixed(4)})` : `✅ Got it! (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
            toast.error(isRtl ? `❌ فشل: ${errorMsg}` : `❌ Failed: ${errorMsg}`)
            console.error('Link resolution failed:', error)
        } finally {
            setIsResolving(false)
        }
    }

    const handleLinkPaste = async (value) => {
        setMapsLink(value)

        if (!value.trim()) {
            setIsExtracted(false)
            return
        }

        // If it's a short link, resolve via backend
        if (isShortLink(value)) {
            await resolveShortLink(value)
            return
        }

        // Try to extract coordinates directly
        const { lat, lng } = extractCoordsFromUrl(value)

        if (lat && lng) {
            setExtractedLat(lat)
            setExtractedLng(lng)
            setIsExtracted(true)
            onLocationSelect?.(lat, lng)
            toast.success(isRtl ? `✅ تم! (${lat.toFixed(4)}, ${lng.toFixed(4)})` : `✅ Got it! (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
        } else if (value.length > 10) {
            toast.error(isRtl ? '❌ لم أجد إحداثيات' : '❌ No coordinates found')
        }
    }

    return (
        <div className="space-y-4">
            {/* Map Display */}
            <div
                className={`relative rounded-xl overflow-hidden border cursor-pointer group ${readonly ? 'h-[200px]' : 'h-[180px]'}`}
                onClick={openInGoogleMaps}
            >
                <iframe
                    key={`${displayLat}-${displayLng}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${displayLng - 0.003}%2C${displayLat - 0.003}%2C${displayLng + 0.003}%2C${displayLat + 0.003}&layer=mapnik&marker=${displayLat}%2C${displayLng}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0, pointerEvents: 'none' }}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all">
                        <ExternalLink className="h-4 w-4" />
                        <span className="text-sm font-medium">{isRtl ? 'افتح في قوقل ماب' : 'Open in Google Maps'}</span>
                    </div>
                </div>
                {(hasLocation || isExtracted) && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {isRtl ? 'محدد' : 'Set'}
                    </div>
                )}
            </div>

            {/* Coordinates Display */}
            {readonly && (
                <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg py-2">
                    📍 {displayLat.toFixed(6)}, {displayLng.toFixed(6)}
                </div>
            )}

            {/* Controls */}
            {!readonly && (
                <div className="space-y-3">
                    <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg py-2">
                        📍 {displayLat.toFixed(6)}, {displayLng.toFixed(6)}
                    </div>
                    {/* GPS Button */}
                    <Button
                        type="button"
                        variant="default"
                        className="w-full gap-2 h-12"
                        onClick={getCurrentLocation}
                    >
                        <Navigation className="h-5 w-5" />
                        {isRtl ? '📍 استخدم موقعي الحالي' : '📍 Use My Current Location'}
                    </Button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-border"></div>
                        <span className="text-xs text-muted-foreground">{isRtl ? 'أو' : 'OR'}</span>
                        <div className="flex-1 h-px bg-border"></div>
                    </div>

                    {/* Google Maps Link Input */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Link className="h-4 w-4" />
                            {isRtl ? 'الصق رابط قوقل ماب (قصير أو طويل):' : 'Paste Google Maps link (short or long):'}
                        </Label>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="https://maps.app.goo.gl/... أو https://google.com/maps/..."
                                value={mapsLink}
                                onChange={(e) => handleLinkPaste(e.target.value)}
                                className={`text-sm pr-10 ${isExtracted ? 'border-green-500 bg-green-50' : ''}`}
                                dir="ltr"
                                disabled={isResolving}
                            />
                            {isResolving && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
                            {isExtracted && !isResolving && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            {isRtl ? '💡 انسخ أي رابط من قوقل ماب والصقه هنا!' : '💡 Copy any Google Maps link and paste here!'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MapPicker
