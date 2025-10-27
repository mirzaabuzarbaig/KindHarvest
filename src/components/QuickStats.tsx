import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, Activity, CheckCircle2 } from "lucide-react";

interface QuickStatsProps {
  userId: string | null;
  userRole: string | null;
}

export default function QuickStats({ userId, userRole }: QuickStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        if (userRole === "donor" && userId) {
          const { data, error } = await supabase
            .from("food_listings")
            .select("status, expiration_date", { head: false })
            .eq("donor_id", userId);
          if (error) throw error;
          const total = data?.length || 0;
          const available = data?.filter((d: any) => d.status === "available").length || 0;
          const claimed = data?.filter((d: any) => d.status === "claimed").length || 0;
          const expired = data?.filter((d: any) => d.status === "expired").length || 0;
          setStats({ total, available, claimed, expired });
        } else {
          const { data, error } = await supabase
            .from("food_listings")
            .select("status, category, expiration_date", { head: false })
            .eq("status", "available");
          if (error) throw error;
          const totalAvailable = data?.length || 0;
          const expiringSoon = data?.filter((d: any) => {
            const days = (new Date(d.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return days <= 2;
          }).length || 0;
          const cooked = data?.filter((d: any) => (d.category || "").toLowerCase() === "cooked").length || 0;
          setStats({ totalAvailable, expiringSoon, cooked });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, userRole]);

  if (loading) {
    return null;
  }

  if (userRole === "donor") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2"><CardContent className="py-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-semibold">{stats.total || 0}</p></div><Package className="w-6 h-6 text-primary"/></CardContent></Card>
        <Card className="border-2"><CardContent className="py-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Available</p><p className="text-2xl font-semibold">{stats.available || 0}</p></div><Activity className="w-6 h-6 text-green-600"/></CardContent></Card>
        <Card className="border-2"><CardContent className="py-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Claimed</p><p className="text-2xl font-semibold">{stats.claimed || 0}</p></div><CheckCircle2 className="w-6 h-6 text-blue-600"/></CardContent></Card>
        <Card className="border-2"><CardContent className="py-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Expired</p><p className="text-2xl font-semibold">{stats.expired || 0}</p></div><Clock className="w-6 h-6 text-rose-600"/></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Card className="border-2"><CardHeader><CardTitle className="text-base">Available</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.totalAvailable || 0}</CardContent></Card>
      <Card className="border-2"><CardHeader><CardTitle className="text-base">Expiring Soon</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.expiringSoon || 0}</CardContent></Card>
      <Card className="border-2"><CardHeader><CardTitle className="text-base">Cooked</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{stats.cooked || 0}</CardContent></Card>
    </div>
  );
}
