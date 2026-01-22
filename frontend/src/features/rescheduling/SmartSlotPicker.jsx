import React from 'react'
import { delay, motion } from 'framer-motion'
import { format } from 'date-fns'
import { enUS, arSA } from 'date-fns/locale' // Import locales
import { useTranslation } from 'react-i18next'
import { Check, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

const SlotCard = ({ slot, isSelected, onClick }) => {
    const { i18n } = useTranslation()
    const date = new Date(slot)
    const locale = i18n.language === 'ar' ? arSA : enUS

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "cursor-pointer transform transition-all duration-200",
                isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-accent"
            )}
        >
            <Card className="p-4 flex items-center justify-between border-2">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center bg-muted text-muted-foreground",
                        isSelected && "bg-primary text-primary-foreground"
                    )}>
                        {isSelected ? <Check className="h-6 w-6" /> : <CalendarIcon className="h-6 w-6" />}
                    </div>
                    <div>
                        <p className="font-semibold text-lg">
                            {format(date, 'EEEE, d MMMM', { locale })}
                        </p>
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <Clock className="h-3 w-3" />
                            <span>{format(date, 'h:mm a', { locale })}</span>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}

const SkeletonLoader = () => (
    <div className="space-y-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-lg" />
        ))}
    </div>
)

const SmartSlotPicker = ({ slots, selectedSlot, onSelect, isLoading }) => {
    const { t } = useTranslation()

    if (isLoading) return <SkeletonLoader />

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">{t('patient.availableSlots')}</h3>
            <div className="grid gap-3">
                {slots.map((slot, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <SlotCard
                            slot={slot}
                            isSelected={selectedSlot === slot}
                            onClick={() => onSelect(slot)}
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

export default SmartSlotPicker
