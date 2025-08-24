import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApprovalDashboard from '../components/approval/ApprovalDashboard';
import { Card, CardContent } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

const Approvals: React.FC = () => {
  const { currentUser: user } = useAuth();
  
  // Debug user object
  console.log('Approvals page - user object:', user);
  console.log('Approvals page - user.role:', user?.role);

  // Check if user has approval permissions
  const hasApprovalPermissions = () => {
    console.log('hasApprovalPermissions - checking user:', user);
    if (!user) {
      console.log('hasApprovalPermissions - no user, returning false');
      return false;
    }
    
    const approvalRoles = ['superadmin', 'regionadmin', 'sektoradmin', 'schooladmin'];
    console.log('hasApprovalPermissions - approvalRoles:', approvalRoles);
    
    // Check user.role
    if (user.role && approvalRoles.includes(user.role)) {
      console.log('hasApprovalPermissions - found role in user.role:', user.role);
      return true;
    }
    
    console.log('hasApprovalPermissions - no matching roles found, returning false');
    console.log('hasApprovalPermissions - user.role:', user.role);
    return false;
  };

  if (!hasApprovalPermissions()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Təsdiq Paneline Giriş Yoxdur
            </h2>
            <p className="text-gray-600 mb-4">
              Bu səhifəyə giriş üçün təsdiq icazələriniz yoxdur.
            </p>
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Təsdiq paneline giriş üçün SuperAdmin, RegionAdmin, SektorAdmin və ya SchoolAdmin rolları tələb olunur.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Approval Dashboard */}
      <ApprovalDashboard />
    </div>
  );
};

export default Approvals;