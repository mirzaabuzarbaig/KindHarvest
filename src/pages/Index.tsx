import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MapPin, Clock, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJoc2woMTQyIDc2JSAzNiUgLyAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
        
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full text-primary font-medium">
              <Heart className="w-4 h-4" />
              <span>Connecting Communities Through Food</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              Share Food. Save Lives. Build Community.
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI-powered platform connecting generous donors with families and nonprofits who need food. 
              Reduce waste, fight hunger, strengthen communities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-glow transition-all duration-300 text-lg px-8 py-6"
              >
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/find-food")}
                className="text-lg px-8 py-6 border-2 hover:bg-muted/50"
              >
                Find Food Near You
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-glow transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Share Your Surplus</h3>
              <p className="text-muted-foreground leading-relaxed">
                Donors easily post available food with details like quantity, type, and expiration date. 
                Every share helps reduce waste and feed those in need.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-glow transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-secondary to-secondary/70 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Find Food Nearby</h3>
              <p className="text-muted-foreground leading-relaxed">
                Recipients search by location, food type, and distance radius. 
                Real-time updates show what's available right now in your area.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-glow transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-accent to-accent/70 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI-Smart Matching</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our AI predicts demand and suggests optimal matches, ensuring food gets where it's needed most before it expires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div className="space-y-2">
              <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Zero
              </div>
              <div className="text-muted-foreground">Setup Cost</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold bg-gradient-to-r from-secondary to-secondary/70 bg-clip-text text-transparent">
                Real-time
              </div>
              <div className="text-muted-foreground">Updates</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                AI-Powered
              </div>
              <div className="text-muted-foreground">Matching</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Make a Difference?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community of generous donors and grateful recipients. Together, we can end food waste and hunger.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-primary to-primary/90 hover:shadow-glow transition-all duration-300 text-lg px-8 py-6"
          >
            Join Now <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
