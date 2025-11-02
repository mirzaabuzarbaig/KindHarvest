import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Search } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="min-h-screen bg-background">
      <BackButton className="absolute top-4 left-4 z-10" />
      <div className="h-screen flex">
        {/* Contacts Sidebar */}
        <div className="w-full md:w-[380px] border-r border-border flex flex-col bg-card">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold">Conversations</h1>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9 bg-muted/50 border-none"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No contacts yet. Accept donation requests to start conversations.
              </div>
            )}
            {contacts.map((c) => (
              <button 
                key={c.id} 
                onClick={() => setActive(c)} 
                className={`w-full flex items-center gap-3 p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                  active?.id === c.id ? 'bg-muted' : ''
                }`}
              >
                <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                  <AvatarImage src={c.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(c.full_name || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {c.full_name || c.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tap to open chat
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-muted/20">
          {active ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                  <AvatarImage src={active.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(active.full_name || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{active.full_name || active.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">
                    {role === 'donor' ? 'Recipient' : 'Donor'}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-3"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              >
                {msgs.map((m, i) => {
                  const isSent = m.sender_id === user?.id;
                  return (
                    <div key={i} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isSent 
                            ? 'bg-primary text-primary-foreground rounded-br-sm' 
                            : 'bg-card border border-border rounded-bl-sm'
                        }`}
                      >
                        <div className="text-sm break-words whitespace-pre-wrap">{m.content}</div>
                        <div className={`text-[10px] mt-1 ${isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border bg-card">
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <Textarea
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    className="min-h-[44px] max-h-[120px] resize-none bg-muted/50 border-none"
                    rows={1}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full"
                    disabled={!text.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <MessageSquare className="w-20 h-20 mx-auto text-muted-foreground/30" />
                <h3 className="text-xl font-semibold text-muted-foreground">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a contact to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
