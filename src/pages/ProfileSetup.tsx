import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" })
    .regex(/^[a-zA-Z\s'-]+$/, { message: "Name contains invalid characters" }),
  phone: z.string()
    .trim()
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 
      { message: "Invalid phone number format" })
    .max(20, { message: "Phone number too long" }),
  address: z.string()
    .trim()
    .min(10, { message: "Address must be at least 10 characters" })
    .max(200, { message: "Address must be less than 200 characters" }),
  role: z.enum(['donor', 'recipient', 'nonprofit'], 
    { message: "Invalid role selected" })
});

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    fullName: "",
    phone: "",
    address: "",
    role: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);

      // Check if profile already exists
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (roleData) {
        // Profile already set up, redirect to dashboard
        navigate("/dashboard");
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found",
        variant: "destructive",
      });
      return;
    }

    if (!profileData.role) {
      toast({
        title: "Error",
        description: "Please select your role",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Validate input
      const validated = profileSchema.parse({
        fullName: profileData.fullName,
        phone: profileData.phone,
        address: profileData.address,
        role: profileData.role
      });

      // Upsert profile (insert or update)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: validated.fullName,
          phone: validated.phone,
          address: validated.address
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        if (import.meta.env.DEV) {
          console.error("Profile error:", profileError);
        }
        throw profileError;
      }

      // Call the security definer function to assign role
      const { error: roleError } = await supabase.rpc('assign_initial_user_role', {
        _role: validated.role
      });

      if (roleError) {
        if (import.meta.env.DEV) {
          console.error("Role error:", roleError);
        }
        throw roleError;
      }

      toast({
        title: "Success!",
        description: "Your profile has been set up. Welcome!",
      });
      
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Setup Error",
          description: error instanceof Error ? error.message : "Failed to set up profile",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-glow">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>Tell us a bit about yourself to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select
                value={profileData.role}
                onValueChange={(value) => setProfileData({ ...profileData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="donor">Donor (I have food to share)</SelectItem>
                  <SelectItem value="recipient">Recipient (I need food)</SelectItem>
                  <SelectItem value="nonprofit">Nonprofit Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profileData.fullName}
                onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
