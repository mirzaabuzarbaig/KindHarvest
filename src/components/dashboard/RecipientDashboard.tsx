import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Package, User, Star, Sparkles, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface RecipientDashboardProps {
  userId: string;
  profile: any;
  userRole: string;
}

const RecipientDashboard = ({ userId, profile, userRole }: RecipientDashboardProps) => {
  const { toast } = useToast();
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [aiMatches, setAiMatches] = useState<any>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    fetchListings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("food_listings_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_listings",
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("food_listings")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching listings:", error);
      }
      toast({
        title: "Error",
        description: "Failed to fetch food listings",
        variant: "destructive",
      });
    } else {
      setListings(data || []);
      setFilteredListings(data || []);
    }
    setLoading(false);
  };

  // AI-powered matching
  const handleAIMatch = async () => {
    if (listings.length === 0) {
      toast({
        title: "No listings available",
        description: "There are no food listings to match at the moment",
      });
      return;
    }

    setMatchingLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-match-donations", {
        body: {
          listings,
          userLocation: profile?.general_area || profile?.address,
          userPreferences: {
            role: userRole,
          }
        }
      });

      if (error) throw error;

      setAiMatches(data);

      // Sort listings by AI match score
      const matchedListings = listings.map((listing: any) => {
        const match = data.matches?.find((m: any) => m.listingId === listing.id);
        return {
          ...listing,
          matchScore: match?.matchScore || 0,
          matchReasoning: match?.reasoning || "",
          matchPriority: match?.priority || "low"
        };
      }).sort((a: any, b: any) => b.matchScore - a.matchScore);

      setFilteredListings(matchedListings);

      toast({
        title: "AI Matching Complete",
        description: `Found ${data.matches?.length || 0} personalized recommendations`,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("AI Match Error:", error);
      }
      toast({
        title: "Matching failed",
        description: error instanceof Error ? error.message : "Failed to match donations",
        variant: "destructive",
      });
    } finally {
      setMatchingLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let result = [...listings];

    // Search filter
    if (searchQuery) {
      result = result.filter((listing: any) => 
        listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.food_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.general_area?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((listing: any) => 
        listing.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Sort
    switch (sortBy) {
      case "recent":
        result.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "expiring":
        result.sort((a: any, b: any) => 
          new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
        );
        break;
      case "match":
        result.sort((a: any, b: any) => 
          (b.matchScore || 0) - (a.matchScore || 0)
        );
        break;
    }

    setFilteredListings(result);
  }, [listings, searchQuery, categoryFilter, sortBy]);

  if (loading) {
    return <div className="text-center py-12">Finding available food...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Available Food Donations</h2>
          <p className="text-muted-foreground">
            Discover and request food donations in your area
          </p>
        </div>
        <Button 
          onClick={handleAIMatch} 
          disabled={matchingLoading || listings.length === 0}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {matchingLoading ? "Analyzing..." : "AI Match"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search food, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="cooked">Cooked</SelectItem>
                  <SelectItem value="packaged">Packaged</SelectItem>
                  <SelectItem value="fresh">Fresh</SelectItem>
                  <SelectItem value="bakery">Bakery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  {aiMatches && <SelectItem value="match">Best Match</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings */}
      {filteredListings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {listings.length === 0 ? "No donations available" : "No results found"}
            </h3>
            <p className="text-muted-foreground">
              {listings.length === 0 
                ? "Check back later for new food donations"
                : "Try adjusting your filters"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing: any) => (
            <Card key={listing.id} className={`hover:shadow-glow transition-shadow ${
              listing.matchPriority === "high" ? "border-2 border-primary" : ""
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-xl">{listing.title}</CardTitle>
                  <div className="flex flex-col gap-2">
                    <Badge className="bg-primary text-primary-foreground">
                      Available
                    </Badge>
                    {listing.matchScore > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {listing.matchScore}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="line-clamp-2">
                  {listing.description}
                </CardDescription>
                
                {listing.matchReasoning && (
                  <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded text-xs">
                    <p className="text-muted-foreground">
                      <strong>AI Match:</strong> {listing.matchReasoning}
                    </p>
                  </div>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="w-4 h-4" />
                    <span>{listing.quantity} {listing.quantity_unit} of {listing.food_type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Expires {formatDistanceToNow(new Date(listing.expiration_date), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="line-clamp-1">{listing.general_area || "Location available upon request"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Verified Donor</span>
                  </div>
                  {listing.transportation_available && (
                    <Badge variant="outline" className="text-xs">
                      Transportation Available
                    </Badge>
                  )}
                </div>

                {listing.pickup_instructions && (
                  <div className="pt-2 text-sm">
                    <p className="font-medium mb-1">Pickup Instructions:</p>
                    <p className="text-muted-foreground line-clamp-2">
                      {listing.pickup_instructions}
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Contact details available upon request approval
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipientDashboard;