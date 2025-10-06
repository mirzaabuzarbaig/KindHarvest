import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Package, Search, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface RecipientDashboardProps {
  userId: string;
  profile: any;
  userRole: string;
}

const RecipientDashboard = ({ userRole }: RecipientDashboardProps) => {
  const { toast } = useToast();
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState("all");

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

  useEffect(() => {
    filterListings();
  }, [listings, searchQuery, foodTypeFilter]);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("food_listings")
      .select(`
        *,
        profiles:donor_id (
          full_name,
          phone
        )
      `)
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch food listings",
        variant: "destructive",
      });
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  const filterListings = () => {
    let filtered = [...listings];

    if (searchQuery) {
      filtered = filtered.filter((listing: any) =>
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (foodTypeFilter !== "all") {
      filtered = filtered.filter((listing: any) =>
        listing.food_type.toLowerCase() === foodTypeFilter.toLowerCase()
      );
    }

    setFilteredListings(filtered);
  };

  const foodTypes = [...new Set(listings.map((l: any) => l.food_type))];

  if (loading) {
    return <div className="text-center py-12">Finding available food...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Find Food Near You</h2>
        <p className="text-muted-foreground">
          Browse available food donations in your area
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={foodTypeFilter} onValueChange={setFoodTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Food Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {foodTypes.map((type: string) => (
                  <SelectItem key={type} value={type.toLowerCase()}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listings */}
      {filteredListings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No food available</h3>
            <p className="text-muted-foreground">
              {searchQuery || foodTypeFilter !== "all"
                ? "Try adjusting your filters"
                : "Check back soon for new donations"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing: any) => (
            <Card key={listing.id} className="hover:shadow-glow transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-xl">{listing.title}</CardTitle>
                  <Badge className="bg-primary text-primary-foreground">
                    Available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="line-clamp-2">
                  {listing.description}
                </CardDescription>
                
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
                    <span className="line-clamp-1">{listing.address}</span>
                  </div>
                  {listing.profiles && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>Donor: {listing.profiles.full_name}</span>
                    </div>
                  )}
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

                {listing.profiles?.phone && (
                  <div className="pt-4">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={`tel:${listing.profiles.phone}`}>
                        Contact Donor
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipientDashboard;
