import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, MapPin, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DonationHistoryProps {
  userId: string;
  userRole: string;
}

const DonationHistory = ({ userId, userRole }: DonationHistoryProps) => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonationHistory();
  }, [userId, userRole]);

  const fetchDonationHistory = async () => {
    try {
      if (userRole === "donor") {
        // Fetch donor's food listings
        const { data, error } = await supabase
          .from("food_listings")
          .select("*")
          .eq("donor_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setDonations(data || []);
      } else {
        // Fetch recipient's donation requests
        const { data, error } = await supabase
          .from("donation_requests")
          .select(`
            *,
            food_listings:food_id (
              title,
              food_name,
              category,
              quantity,
              quantity_unit,
              general_area
            )
          `)
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setDonations(data || []);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching donation history:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "claimed":
      case "accepted":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "expired":
      case "rejected":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-glow">
      <CardHeader>
        <CardTitle className="text-2xl">Donation History</CardTitle>
        <CardDescription>
          {userRole === "donor" 
            ? "Your past food donations and contributions" 
            : "Your received food donations"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {donations.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No history yet</h3>
            <p className="text-muted-foreground">
              {userRole === "donor"
                ? "Start sharing food to build your donation history"
                : "Request food donations to see them here"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {donations.map((item: any) => (
              <div
                key={item.id || item.request_id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">
                        {userRole === "donor" 
                          ? item.title || item.food_name 
                          : item.food_listings?.title || item.food_listings?.food_name || "Food Item"}
                      </h4>
                      {item.category && (
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      )}
                      {item.food_listings?.category && (
                        <p className="text-sm text-muted-foreground">{item.food_listings.category}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(item.status)} variant="outline">
                      {item.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {userRole === "donor" && (
                      <>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{item.quantity} {item.quantity_unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{item.general_area}</span>
                        </div>
                      </>
                    )}
                    {userRole !== "donor" && item.food_listings && (
                      <>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{item.food_listings.quantity} {item.food_listings.quantity_unit}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{item.food_listings.general_area}</span>
                        </div>
                      </>
                    )}
                    {item.match_score && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span>{item.match_score}% Match</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DonationHistory;