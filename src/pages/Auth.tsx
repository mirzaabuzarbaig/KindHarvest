import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Heart, ArrowLeft, User, Lock } from "lucide-react";
import heroImage from "@/assets/hero-children.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [signupData, setSignupData] = useState({
    email: "",
    password: ""
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if profile is set up
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (roleData) {
          navigate("/dashboard");
        } else {
          navigate("/profile-setup");
        }
      }
    };

    checkAuth();
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!signupData.email || !signupData.password) {
        throw new Error("Please fill in all fields");
      }

      if (signupData.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile-setup`
        }
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Success!",
          description: "Account created! Please complete your profile.",
        });
        
        navigate("/profile-setup");
      }
    } catch (error) {
      toast({
        title: "Signup Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      // Check if profile is set up
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      
      if (roleData) {
        navigate("/dashboard");
      } else {
        navigate("/profile-setup");
      }
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
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                </div>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-secondary rounded flex items-center justify-center">
                        <User className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
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
                        id="signup-password"
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        className="pl-16 h-12"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                  <div className="text-center pt-2">
                    <span className="text-sm text-muted-foreground">Already have an account? </span>
                    <button 
                      type="button"
                      onClick={() => {
                        const loginTab = document.querySelector('[value="login"]') as HTMLElement;
                        loginTab?.click();
                      }}
                      className="text-sm text-secondary hover:underline font-medium"
                    >
                      Login
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
