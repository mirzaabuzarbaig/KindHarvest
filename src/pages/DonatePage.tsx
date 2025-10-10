import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart } from "lucide-react";
import { z } from "zod";

const foodListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  foodType: z.string().min(1, "Please select a food type"),
  quantity: z.number().positive("Quantity must be positive"),
  quantityUnit: z.string().min(1, "Please select a unit"),
  expirationDate: z.string().min(1, "Expiration date is required"),
  address: z.string().min(5, "Address is required"),
  pickupInstructions: z.string().optional(),
  transportationAvailable: z.boolean()
});

const DonatePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    foodType: "",
    quantity: "",
    quantityUnit: "",
    expirationDate: "",
    address: "",
    pickupInstructions: "",
    transportationAvailable: false,
    locationLat: null,
    locationLng: null
  });

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            locationLat: position.coords.latitude,
            locationLng: position.coords.longitude
          });
          toast({
            title: "Location captured",
            description: "Your location has been set",
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Could not get your location. Please enter address manually.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = foodListingSchema.parse({
        ...formData,
        quantity: parseFloat(formData.quantity)
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to post food");
      }

      // Verify user has donor role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!roleData || roleData.role !== "donor") {
        throw new Error("You must be a donor to post food donations");
      }

      const { error } = await supabase
        .from("food_listings")
        .insert({
          donor_id: user.id,
          title: validated.title,
          description: validated.description || "",
          food_type: validated.foodType,
          quantity: validated.quantity,
          quantity_unit: validated.quantityUnit,
          expiration_date: validated.expirationDate,
          address: validated.address,
          pickup_instructions: validated.pickupInstructions || "",
          transportation_available: validated.transportationAvailable,
          location_lat: formData.locationLat || 0,
          location_lng: formData.locationLng || 0,
          status: "available"
        });

      if (error) {
        console.error("Insert error:", error);
        throw error;
      }

      toast({
        title: "Success!",
        description: "Your food donation has been posted",
      });
      
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Dashboard
        </Button>

        <Card className="shadow-glow">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-3xl">Share Your Food</CardTitle>
            <CardDescription>
              Help reduce waste and support your community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Fresh vegetables from garden"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell recipients about the food..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="foodType">Food Type *</Label>
                  <Select
                    value={formData.foodType}
                    onValueChange={(value) => setFormData({ ...formData, foodType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vegetables">Vegetables</SelectItem>
                      <SelectItem value="Fruits">Fruits</SelectItem>
                      <SelectItem value="Grains">Grains</SelectItem>
                      <SelectItem value="Dairy">Dairy</SelectItem>
                      <SelectItem value="Meat">Meat</SelectItem>
                      <SelectItem value="Baked Goods">Baked Goods</SelectItem>
                      <SelectItem value="Prepared Meals">Prepared Meals</SelectItem>
                      <SelectItem value="Canned Goods">Canned Goods</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.quantityUnit}
                    onValueChange={(value) => setFormData({ ...formData, quantityUnit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="lbs">Pounds</SelectItem>
                      <SelectItem value="portions">Portions</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="boxes">Boxes</SelectItem>
                      <SelectItem value="items">Items</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">Expiration Date *</Label>
                  <Input
                    id="expiration"
                    type="datetime-local"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Pickup Address *</Label>
                <Input
                  id="address"
                  placeholder="123 Main St, City, State"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  className="mt-2"
                >
                  Use Current Location
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Pickup Instructions</Label>
                <Textarea
                  id="instructions"
                  placeholder="e.g., Ring doorbell, available after 5pm..."
                  value={formData.pickupInstructions}
                  onChange={(e) => setFormData({ ...formData, pickupInstructions: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="transportation">Transportation Available</Label>
                  <p className="text-sm text-muted-foreground">
                    Can you deliver the food?
                  </p>
                </div>
                <Switch
                  id="transportation"
                  checked={formData.transportationAvailable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, transportationAvailable: checked })
                  }
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Posting..." : "Post Food Donation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DonatePage;
