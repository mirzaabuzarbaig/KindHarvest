import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, Search } from "lucide-react";
import DonorDashboard from "@/components/dashboard/DonorDashboard";
import RecipientDashboard from "@/components/dashboard/RecipientDashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FloatingFoodBackground from "@/components/FloatingFoodBackground";
import DashboardSidebar from "@/components/DashboardSidebar";
import QuickStats from "@/components/QuickStats";

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
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleError) {
        if (import.meta.env.DEV) {
          console.error("Error fetching role:", roleError);
        }
      }

      if (roleData) {
        setUserRole(roleData.role);
      } else {
        // No role found, redirect to auth
        toast({
          title: "Setup Required",
          description: "Please complete your profile setup",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        if (import.meta.env.DEV) {
          console.error("Error fetching profile:", profileError);
        }
      }

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
    <div className="relative min-h-screen bg-background">
      <FloatingFoodBackground />
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
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
              aria-label="Open profile"
            >
              <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                <AvatarImage
                  src={(profile as any)?.avatar_url || (user as any)?.user_metadata?.avatar_url || ""}
                  alt="Profile"
                />
                <AvatarFallback>
                  {(profile as any)?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <DashboardSidebar />

          {/* Main center/right area */}
          <div className="flex-1 space-y-6">
            {/* Top hero + inbox */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Hero banner */}
              <div className="xl:col-span-2">
                <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rose-200/20 via-primary/10 to-transparent">
                  <div className="p-6 md:p-8">
                    <p className="text-sm text-muted-foreground mb-2">Welcome</p>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                      {profile?.full_name || "Food Share User"}
                    </h2>
                    <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
                      {profile?.general_area || profile?.address || "Your location"}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {userRole === "donor" ? (
                        <Button onClick={() => navigate("/donate")} className="gap-2">
                          <Plus className="w-4 h-4" />
                          Post a Donation
                        </Button>
                      ) : (
                        <Button onClick={() => navigate("/find-food")} variant="outline" className="gap-2">
                          <Search className="w-4 h-4" />
                          Explore Donations
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => navigate("/profile")}>Update Profile</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right quotation card */}
              <div>
                <div className="rounded-2xl border bg-card p-6 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-muted-foreground">Thought for today</p>
                    <blockquote className="mt-3 text-xl font-medium leading-relaxed">
                      “When we share food, we share hope. A small act can make a big difference.”
                    </blockquote>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">Join the mission to reduce waste and nourish communities.</p>
                </div>
              </div>
            </div>

            {/* Existing dashboards below */}
            <QuickStats userId={user?.id} userRole={userRole} />
            {userRole === "donor" && <DonorDashboard userId={user?.id} profile={profile} />}
            {(userRole === "recipient" || userRole === "nonprofit") && (
              <RecipientDashboard userId={user?.id} profile={profile} userRole={userRole} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
