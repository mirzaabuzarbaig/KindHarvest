import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Requests(){
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);

  useEffect(()=>{(async()=>{
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    setUser(session.user);
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
    setRole(roleData?.role || null);
    await refresh(session.user.id, roleData?.role);
  })();},[]);

  const refresh = async (uid: string, r: string) => {
    if (r === "donor"){
      const { data } = await supabase
        .from("donation_requests")
        .select("request_id, food_id, recipient_id, status, profiles:recipient_id(full_name)")
        .eq("donor_id", uid)
        .order("created_at", { ascending: false });
      setIncoming(data||[]);
      setOutgoing([]);
    } else {
      const { data } = await supabase
        .from("donation_requests")
        .select("request_id, food_id, donor_id, status, profiles:donor_id(full_name)")
        .eq("recipient_id", uid)
        .order("created_at", { ascending: false });
      setOutgoing(data||[]);
      setIncoming([]);
    }
  };

  const updateStatus = async (request_id: string, status: "accepted"|"rejected") => {
    await supabase.from("donation_requests").update({ status }).eq("request_id", request_id);
    if (role === "donor") await refresh(user.id, role!);
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Requests</h1>
      {role === "donor" ? (
        <Card>
          <CardHeader><CardTitle>Incoming Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {incoming.length === 0 && <div className="text-sm text-muted-foreground">No requests yet.</div>}
            {incoming.map((r)=> (
              <div key={r.request_id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="font-medium">{r.profiles?.full_name || r.recipient_id}</div>
                  <div className="text-xs text-muted-foreground">Listing: {r.food_id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  {r.status === 'accepted' && (
                    <Button size="sm" variant="outline" onClick={()=>navigate(`/messages?to=${r.recipient_id}`)}>
                      <MessageCircle className="w-4 h-4 mr-2"/> Message
                    </Button>
                  )}
                  {r.status === 'pending' && (
                    <>
                      <Button size="sm" onClick={()=>updateStatus(r.request_id,'accepted')}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={()=>updateStatus(r.request_id,'rejected')}>Reject</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>My Requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {outgoing.length === 0 && <div className="text-sm text-muted-foreground">No requests yet.</div>}
            {outgoing.map((r)=> (
              <div key={r.request_id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-1">
                  <div className="font-medium">{r.profiles?.full_name || r.donor_id}</div>
                  <div className="text-xs text-muted-foreground">Listing: {r.food_id}</div>
                </div>
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
