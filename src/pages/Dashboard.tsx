import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Search } from "lucide-react";
import DonorDashboard from "@/components/dashboard/DonorDashboard";
import RecipientDashboard from "@/components/dashboard/RecipientDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Fetch user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setLoading(false);
    };

    initializeUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Food Share
            </h1>
            <p className="text-sm text-muted-foreground capitalize">{userRole} Dashboard</p>
          </div>
          
          <div className="flex items-center gap-4">
            {userRole === "donor" && (
              <Button onClick={() => navigate("/donate")} className="gap-2">
                <Plus className="w-4 h-4" />
                Post Food
              </Button>
            )}
            {(userRole === "recipient" || userRole === "nonprofit") && (
              <Button onClick={() => navigate("/find-food")} variant="outline" className="gap-2">
                <Search className="w-4 h-4" />
                Find Food
              </Button>
            )}
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        {userRole === "donor" && <DonorDashboard userId={user?.id} profile={profile} />}
        {(userRole === "recipient" || userRole === "nonprofit") && (
          <RecipientDashboard userId={user?.id} profile={profile} userRole={userRole} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
