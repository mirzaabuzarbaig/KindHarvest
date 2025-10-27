import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import BackButton from "@/components/BackButton";

interface UserLite { id: string; full_name?: string | null; avatar_url?: string | null; }
interface Message { id?: string; sender_id: string; receiver_id: string; content: string; created_at: string; }

export default function Messages() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [contacts, setContacts] = useState<UserLite[]>([]);
  const [active, setActive] = useState<UserLite | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dbChanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);
      // role
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
      setRole(roleData?.role || null);
      // contacts via donation_requests
      try {
        if (roleData?.role === "donor") {
          const { data } = await supabase
            .from("donation_requests")
            .select("recipient_id, status, profiles:recipient_id(full_name, avatar_url)")
            .eq("donor_id", session.user.id)
            .eq("status", "accepted");
          const uniq = new Map<string, UserLite>();
          (data || []).forEach((r: any) => {
            uniq.set(r.recipient_id, { id: r.recipient_id, full_name: r.profiles?.full_name, avatar_url: r.profiles?.avatar_url });
          });
          let arr = Array.from(uniq.values());
          setContacts(arr);
          // preselect via ?to=
          const to = searchParams.get("to");
          let pre = arr.find(u => u.id === to);
          if (!pre && to) {
            // fetch minimal profile to allow immediate chat
            try {
              const { data: p } = await supabase.from("profiles").select("full_name, profile_image_url").eq("id", to).maybeSingle();
              pre = { id: to, full_name: p?.full_name || null, avatar_url: p?.profile_image_url || null };
              arr = [pre, ...arr];
              setContacts(arr);
            } catch (_) {}
          }
          setActive(pre || arr[0] || null);
        } else {
          const { data } = await supabase
            .from("donation_requests")
            .select("donor_id, status, profiles:donor_id(full_name, avatar_url)")
            .eq("recipient_id", session.user.id)
            .eq("status", "accepted");
          const uniq = new Map<string, UserLite>();
          (data || []).forEach((r: any) => {
            uniq.set(r.donor_id, { id: r.donor_id, full_name: r.profiles?.full_name, avatar_url: r.profiles?.avatar_url });
          });
          let arr = Array.from(uniq.values());
          setContacts(arr);
          const to = searchParams.get("to");
          let pre = arr.find(u => u.id === to);
          if (!pre && to) {
            try {
              const { data: p } = await supabase.from("profiles").select("full_name, profile_image_url").eq("id", to).maybeSingle();
              pre = { id: to, full_name: p?.full_name || null, avatar_url: p?.profile_image_url || null };
              arr = [pre, ...arr];
              setContacts(arr);
            } catch (_) {}
          }
          setActive(pre || arr[0] || null);
        }
      } catch (_) {
        // swallow
      }
    })();
  }, [navigate, searchParams]);

  // derive room name
  const room = useMemo(() => {
    if (!user?.id || !active?.id) return null;
    return `dm:${[user.id, active.id].sort().join(":")}`;
  }, [user?.id, active?.id]);

  // subscribe realtime
  useEffect(() => {
    if (!room) return;
    chanRef.current?.unsubscribe();
    const ch = supabase.channel(room);
    chanRef.current = ch;
    ch.on("broadcast", { event: "message" }, (payload) => {
      const m = payload.payload as Message;
      setMsgs((prev) => [...prev, m]);
    }).subscribe();
    return () => { ch.unsubscribe(); };
  }, [room]);

  // Load history from messages table if it exists; subscribe to DB inserts
  useEffect(() => {
    if (!user?.id || !active?.id) return;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${active.id}),and(sender_id.eq.${active.id},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });
        if (!error && Array.isArray(data)) {
          const mapped: Message[] = data.map((d: any) => ({
            id: d.id,
            sender_id: d.sender_id,
            receiver_id: d.receiver_id,
            content: d.content,
            created_at: d.created_at,
          }));
          setMsgs(mapped);
        }
      } catch (_) { /* ignore if table missing */ }

      // subscribe to DB inserts for live receive
      try {
        dbChanRef.current?.unsubscribe();
        const dbc = supabase.channel(`msg-db-${user.id}-${active.id}`);
        dbChanRef.current = dbc;
        dbc.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const d = payload.new;
          if (!d) return;
          const involvesPair = (d.sender_id === user.id && d.receiver_id === active.id) || (d.sender_id === active.id && d.receiver_id === user.id);
          if (involvesPair) {
            setMsgs((prev) => [...prev, {
              id: d.id, sender_id: d.sender_id, receiver_id: d.receiver_id, content: d.content, created_at: d.created_at,
            }]);
          }
        }).subscribe();
      } catch (_) { /* ignore if replication not enabled */ }
    })();

    return () => { dbChanRef.current?.unsubscribe(); };
  }, [user?.id, active?.id]);

  // scroll to bottom
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !user?.id || !active?.id) return;
    const m: Message = {
      sender_id: user.id,
      receiver_id: active.id,
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, m]);
    setText("");
    // broadcast (no table required, so no errors if DB lacks messages table)
    try { await chanRef.current?.send({ type: "broadcast", event: "message", payload: m }); } catch (_) {}
    // best-effort persist if a messages table exists
    try {
      await (supabase as any).from("messages").insert({ sender_id: m.sender_id, receiver_id: m.receiver_id, content: m.content });
    } catch (_) { /* no-op if table missing */ }
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-8">
      <BackButton className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contacts */}
        <Card className="md:col-span-1 p-3">
          <div className="flex items-center gap-2 mb-3 font-semibold"><MessageSquare className="w-4 h-4"/> Conversations</div>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {contacts.length === 0 && (
              <div className="text-sm text-muted-foreground p-3">No contacts yet. Interact with listings to start a conversation.</div>
            )}
            {contacts.map((c) => (
              <button key={c.id} onClick={() => setActive(c)} className={`w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-muted ${active?.id===c.id? 'bg-muted' : ''}`}>
                <Avatar className="h-8 w-8"><AvatarImage src={c.avatar_url || ''}/><AvatarFallback>{(c.full_name||'U')[0]}</AvatarFallback></Avatar>
                <div className="truncate">
                  <div className="text-sm font-medium truncate">{c.full_name || c.id.slice(0,8)}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat */}
        <Card className="md:col-span-2 p-3 flex flex-col h-[75vh]">
          <div className="flex items-center gap-3 border-b pb-3">
            {active ? (
              <>
                <Avatar className="h-8 w-8"><AvatarImage src={active.avatar_url || ''}/><AvatarFallback>{(active.full_name||'U')[0]}</AvatarFallback></Avatar>
                <div className="font-semibold">{active.full_name || active.id.slice(0,8)}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Select a conversation</div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id===user?.id? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.content}
                <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form className="flex gap-2 pt-2" onSubmit={(e)=>{e.preventDefault(); send();}}>
            <Input placeholder="Type a message" value={text} onChange={(e)=>setText(e.target.value)} />
            <Button type="submit" className="gap-2"><Send className="w-4 h-4"/> Send</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
