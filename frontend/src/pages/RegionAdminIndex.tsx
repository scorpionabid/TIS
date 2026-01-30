import { RegionAdminDashboard } from "@/components/regionadmin/RegionAdminDashboard";
import { RegionOperatorDashboard } from "@/components/regionoperator/RegionOperatorDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { USER_ROLES } from "@/constants/roles";

export default function RegionAdminIndex() {
  const { currentUser } = useAuth();

  if (currentUser?.role === USER_ROLES.REGIONOPERATOR) {
    return <RegionOperatorDashboard />;
  }

  return <RegionAdminDashboard />;
}
