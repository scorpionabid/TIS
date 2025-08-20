import { CheckCircle, XCircle, Clock, AlertTriangle, User } from 'lucide-react';

export const useAttendanceStatus = () => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'excused':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Var';
      case 'absent': return 'Yox';
      case 'late': return 'Gecikmə';
      case 'excused': return 'İzinli';
      default: return 'Təyin edilməyib';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'destructive';
      case 'late': return 'warning';
      case 'excused': return 'primary';
      default: return 'secondary';
    }
  };

  return {
    getStatusIcon,
    getStatusText,
    getStatusColor,
  };
};