import { useMutation } from '@tanstack/react-query'
import api from '@/lib/axios'

export const useConflictResolution = () => {

    // Check Conflicts Mutation
    const checkConflicts = useMutation({
        mutationFn: async ({ startDate, endDate }) => {
            const { data } = await api.post('scheduling/conflicts/', {
                start_date: startDate,
                end_date: endDate
            })
            return data
        }
    })

    // Create Time Off & Auto Process
    const createTimeOff = useMutation({
        mutationFn: async ({ startDate, endDate, reason, action }) => {
            const { data } = await api.post('scheduling/time-off/', {
                start_date: startDate,
                end_date: endDate,
                reason,
                action // 'AUTO_PROCESS' or 'CANCEL_ONLY'
            })
            return data
        }
    })

    return {
        checkConflicts,
        createTimeOff
    }
}
