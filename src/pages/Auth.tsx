import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, ArrowLeft, User, Lock } from "lucide-react";
import { z } from "zod";
import heroImage from "@/assets/hero-children.jpg";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  role: z.enum(["donor", "recipient", "nonprofit"], { required_error: "Please select a role" })
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    address: "",
    role: ""
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  const [sessionUser, setSessionUser] = useState<{ id: string; email?: string } | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!active) return;
      setSessionUser(user);

      if (user) {
        const [{ data: roleData }, { data: profData }] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("full_name, phone, address")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (!active) return;
        setNeedsSetup(!roleData?.role || !profData?.full_name);

        if (profData) {
          setSignupData((prev) => ({
            ...prev,
            fullName: (profData as any).full_name || "",
            phone: (profData as any).phone || "",
            address: (profData as any).address || "",
          }));
        }
      } else {
        setNeedsSetup(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signupSchema.parse(signupData);
      
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validated.fullName,
            phone: validated.phone || "",
            address: validated.address,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Insert role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: validated.role });

        if (roleError) throw roleError;

        toast({
          title: "Success!",
          description: "Your account has been created. Welcome!",
        });
        
        navigate("/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else if (error instanceof Error) {
        toast({
          title: "Signup Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Login Error",
        description: error instanceof Error ? error.message : "Failed to login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Children laughing together" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-background/80" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Home
        </Button>

        <Card className="shadow-glow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Join the Community</CardTitle>
            <CardDescription>Connect hearts and hands to reduce food waste</CardDescription>
          </CardHeader>
          <CardContent>
            {needsSetup && sessionUser ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  try {
                    if (!sessionUser) throw new Error("Not logged in");

                    // Ensure role exists
                    const { data: roleData } = await supabase
                      .from("user_roles")
                      .select("role")
                      .eq("user_id", sessionUser.id)
                      .maybeSingle();

                    if (!roleData?.role) {
                      if (!signupData.role) throw new Error("Please select a role");
                      const { error: roleErr } = await supabase
                        .from("user_roles")
                        .insert({ user_id: sessionUser.id, role: signupData.role as any });
                      if (roleErr) throw roleErr;
                    }

                    // Upsert profile
                    const { error: profileErr } = await supabase
                      .from("profiles")
                      .upsert({
                        id: sessionUser.id,
                        full_name: signupData.fullName,
                        phone: signupData.phone,
                        address: signupData.address,
                      });
                    if (profileErr) throw profileErr;

                    toast({
                      title: "Profile updated",
                      description: "You're all set! Redirecting to your dashboard.",
                    });
                    navigate("/dashboard");
                  } catch (err) {
                    toast({
                      title: "Setup Error",
                      description: err instanceof Error ? err.message : "Failed to complete setup",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <CardTitle className="text-2xl">Complete your profile</CardTitle>
                  <CardDescription>Finish setup to continue</CardDescription>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-role">I am a</Label>
                  <Select
                    value={signupData.role}
                    onValueChange={(value) => setSignupData({ ...signupData, role: value })}
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
                  <Label htmlFor="setup-name">Full Name</Label>
                  <Input
                    id="setup-name"
                    value={signupData.fullName}
                    onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-phone">Phone (Optional)</Label>
                  <Input
                    id="setup-phone"
                    type="tel"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup-address">Address</Label>
                  <Input
                    id="setup-address"
                    value={signupData.address}
                    onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving..." : "Save & Continue"}
                </Button>
              </form>
            ) : (
              <>
                <Tabs defaultValue="login">
                  <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
                    <TabsTrigger value="login" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-foreground">Login Form</h2>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-secondary rounded flex items-center justify-center">
                            <User className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="Email or Phone"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            className="pl-16 h-12"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-secondary rounded flex items-center justify-center">
                            <Lock className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="Password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            className="pl-16 h-12"
                            required
                          />
                        </div>
                        <div className="text-left">
                          <button type="button" className="text-sm text-secondary hover:underline">
                            Forgot password?
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold" disabled={loading}>
                        {loading ? "Logging in..." : "Login"}
                      </Button>
                      <div className="text-center pt-2">
                        <span className="text-sm text-muted-foreground">Not a member? </span>
                        <button 
                          type="button"
                          onClick={() => {
                            const signupTab = document.querySelector('[value="signup"]') as HTMLElement;
                            signupTab?.click();
                          }}
                          className="text-sm text-secondary hover:underline font-medium"
                        >
                          Signup now
                        </button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-role">I am a</Label>
                        <Select
                          value={signupData.role}
                          onValueChange={(value) => setSignupData({ ...signupData, role: value })}
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
                        <Label htmlFor="signup-name">Full Name</Label>
                        <Input
                          id="signup-name"
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">Phone (Optional)</Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          value={signupData.phone}
                          onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-address">Address</Label>
                        <Input
                          id="signup-address"
                          value={signupData.address}
                          onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
