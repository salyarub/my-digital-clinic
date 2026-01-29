

class AdminDoctorEntryView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """List all unverified doctors"""
        pending_doctors = Doctor.objects.filter(is_verified=False).select_related('user')
        serializer = AdminDoctorListSerializer(pending_doctors, many=True)
        return Response(serializer.data)
        
    def post(self, request):
        """Approve or Reject doctor"""
        doctor_id = request.data.get('doctor_id')
        action = request.data.get('action') # 'approve' or 'reject'
        
        if not doctor_id or not action:
            return Response({'error': 'doctor_id and action are required'}, status=400)
            
        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response({'error': 'Doctor not found'}, status=404)
            
        if action == 'approve':
            doctor.is_verified = True
            doctor.save()
            
            # Send notification/email could go here
            
            return Response({'status': 'approved', 'message': f'Doctor {doctor.user.first_name} approved'})
            
        elif action == 'reject':
            user = doctor.user
            user.delete() # This cascades to doctor profile
            return Response({'status': 'rejected', 'message': 'Doctor application rejected and removed'})
            
        return Response({'error': 'Invalid action'}, status=400)
