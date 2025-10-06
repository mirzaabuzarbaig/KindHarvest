import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Package, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface DonorDashboardProps {
  userId: string;
  profile: any;
}

const DonorDashboard = ({ userId }: DonorDashboardProps) => {
  const { toast } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("food_listings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_listings",
          filter: `donor_id=eq.${userId}`,
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchListings = async () => {
    const { data, error } = await supabase
      .from("food_listings")
      .select("*")
      .eq("donor_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch listings",
        variant: "destructive",
      });
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("food_listings")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete listing",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Listing deleted successfully",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-primary text-primary-foreground";
      case "claimed":
        return "bg-secondary text-secondary-foreground";
      case "expired":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading your donations...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Your Food Donations</h2>
        <p className="text-muted-foreground">
          Manage and track your food sharing contributions
        </p>
      </div>

      {listings.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No donations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start sharing your surplus food with those who need it
            </p>
            <Button onClick={() => window.location.href = "/donate"}>
              Post Your First Donation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing: any) => (
            <Card key={listing.id} className="hover:shadow-glow transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{listing.title}</CardTitle>
                    <Badge className={getStatusColor(listing.status)}>
                      {listing.status}
                    </Badge>
                  </div>
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
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(listing.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonorDashboard;
