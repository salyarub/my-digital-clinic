import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { AlertTriangle, Wand2, XCircle } from 'lucide-react'
import { useConflictResolution } from './hooks/useConflictResolution'

const ConflictWizard = ({ isOpen, onClose, conflicts, dateRange, onSuccess }) => {
    const { t } = useTranslation()
    const { createTimeOff } = useConflictResolution()
    const [step, setStep] = useState('WARNING') // WARNING, PROCESSING

    if (!isOpen) return null

    const handleAction = (action) => {
        createTimeOff.mutate({
            startDate: dateRange.start,
            endDate: dateRange.end,
            reason: "Doctor Time Off",
            action
        }, {
            onSuccess: (data) => {
                onSuccess(data)
                onClose()
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg"
                >
                    <Card className="border-amber-400 shadow-xl overflow-hidden">
                        <div className="bg-amber-100 p-4 border-b border-amber-200 flex items-center gap-3 text-amber-800">
                            <AlertTriangle className="h-6 w-6" />
                            <h3 className="font-bold text-lg">{t('doctor.conflictsDetected')}</h3>
                        </div>

                        <CardContent className="pt-6">
                            <p className="text-lg text-center mb-6">
                                {t('doctor.conflictsMsg', { count: conflicts.conflict_count })}
                            </p>

                            <div className="bg-muted p-4 rounded-lg mb-6 max-h-40 overflow-y-auto">
                                <ul className="space-y-2">
                                    {conflicts.conflicting_bookings.map(b => (
                                        <li key={b.id} className="text-sm border-b pb-2 last:border-0">
                                            Booking #{b.id.slice(0, 8)} - {new Date(b.time).toLocaleString()}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Button
                                    variant="default"
                                    className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0"
                                    onClick={() => handleAction('AUTO_PROCESS')}
                                    disabled={createTimeOff.isPending}
                                >
                                    <Wand2 className="h-6 w-6" />
                                    <span>{t('doctor.autoProcess')}</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    className="h-auto py-4 flex flex-col items-center gap-2 border-destructive text-destructive hover:bg-destructive/10"
                                    onClick={() => handleAction('CANCEL_ONLY')}
                                    disabled={createTimeOff.isPending}
                                >
                                    <XCircle className="h-6 w-6" />
                                    <span>{t('doctor.cancelOnly')}</span>
                                </Button>
                            </div>
                        </CardContent>
                        <CardFooter className="justify-end border-t bg-muted/20 p-4">
                            <Button variant="ghost" onClick={onClose} disabled={createTimeOff.isPending}>
                                Cancel
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default ConflictWizard
