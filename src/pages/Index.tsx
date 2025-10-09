import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MapPin, Clock, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-children.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Children sharing food and laughing together" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold text-secondary leading-tight drop-shadow-lg">
              Share Food. Save Lives. Build Community.
            </h1>
            
            <p className="text-2xl md:text-3xl text-foreground font-medium max-w-2xl mx-auto leading-relaxed">
              {user ? "Ready to make a difference?" : "Join our community"}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {user ? (
                <>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/donate")}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground hover:shadow-glow transition-all duration-300 text-lg px-8 py-6 font-bold"
                  >
                    Donate Food <Heart className="ml-2 w-5 h-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/dashboard")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-glow transition-all duration-300 text-lg px-8 py-6 font-bold"
                  >
                    Need Food <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/auth")}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground hover:shadow-glow transition-all duration-300 text-lg px-8 py-6 font-bold"
                  >
                    Sign Up <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate("/auth")}
                    className="text-lg px-8 py-6 border-2 border-foreground hover:bg-muted/50 font-bold"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-secondary">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-glow transition-shadow border-2 border-border">
              <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-secondary">Share Your Surplus</h3>
              <p className="text-foreground leading-relaxed">
                Donors easily post available food with details like quantity, type, and expiration date. 
                Every share helps reduce waste and feed those in need.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-glow transition-shadow border-2 border-border">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-secondary">Find Food Nearby</h3>
              <p className="text-foreground leading-relaxed">
                Recipients search by location, food type, and distance radius. 
                Real-time updates show what's available right now in your area.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-glow transition-shadow border-2 border-border">
              <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-secondary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-secondary">AI-Smart Matching</h3>
              <p className="text-foreground leading-relaxed">
                Our AI predicts demand and suggests optimal matches, ensuring food gets where it's needed most before it expires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div className="space-y-2">
              <div className="text-5xl font-bold text-secondary">
                Zero
              </div>
              <div className="text-foreground">Setup Cost</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold text-secondary">
                Real-time
              </div>
              <div className="text-foreground">Updates</div>
            </div>
            <div className="space-y-2">
              <div className="text-5xl font-bold text-secondary">
                AI-Powered
              </div>
              <div className="text-foreground">Matching</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6 text-secondary">Ready to Make a Difference?</h2>
          <p className="text-xl text-foreground mb-8 max-w-2xl mx-auto">
            Join our community of generous donors and grateful recipients. Together, we can end food waste and hunger.
          </p>
          {!user && (
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground hover:shadow-glow transition-all duration-300 text-lg px-8 py-6 font-bold"
            >
              Join Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
