import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Inbox,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Bot,
  ShieldCheck,
  Send,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { User as UserType } from "@shared/schema";

interface SupportConversation {
  id: string;
  userId: string;
  userRole: string;
  status: "open" | "escalated" | "closed";
  subject?: string;
  assignedAdminId?: string;
  lastActivityAt: string;
  createdAt: string;
  user: UserType;
  unreadCount: number;
  lastMessage?: SupportMessage;
}

interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: "user" | "ai" | "admin";
  senderId?: string;
  content: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  conversationId: string;
  ticketNumber: string;
  reason: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "new" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  conversation: SupportConversation;
  user: UserType;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  escalated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [ticketNotes, setTicketNotes] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isLoadingConversations } = useQuery<SupportConversation[]>({
    queryKey: ["/api/admin/support/conversations", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/admin/support/conversations" 
        : `/api/admin/support/conversations?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });

  const { data: tickets, isLoading: isLoadingTickets } = useQuery<SupportTicket[]>({
    queryKey: ["/api/admin/support/tickets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/support/tickets", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  const { data: conversationMessages, isLoading: isLoadingMessages } = useQuery<{
    conversation: SupportConversation;
    messages: SupportMessage[];
  }>({
    queryKey: ["/api/support/conversations", selectedConversation?.id],
    queryFn: async () => {
      const res = await fetch(`/api/support/conversations/${selectedConversation!.id}`, { 
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedConversation,
  });

  const assignMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await apiRequest("POST", `/api/admin/support/conversations/${conversationId}/assign`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/conversations"] });
      toast({ title: "Conversation assigned to you" });
    },
    onError: () => {
      toast({ title: "Failed to assign conversation", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      const res = await apiRequest("POST", `/api/admin/support/conversations/${conversationId}/messages`, { 
        content 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/conversations", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/conversations"] });
      setReplyMessage("");
      toast({ title: "Message sent" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const closeConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await apiRequest("POST", `/api/support/conversations/${conversationId}/close`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/conversations"] });
      setSelectedConversation(null);
      toast({ title: "Conversation closed" });
    },
    onError: () => {
      toast({ title: "Failed to close conversation", variant: "destructive" });
    },
  });

  const resolveTicketMutation = useMutation({
    mutationFn: async ({ ticketId, notes }: { ticketId: string; notes: string }) => {
      const res = await apiRequest("POST", `/api/admin/support/tickets/${ticketId}/resolve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/tickets"] });
      setTicketNotes("");
      toast({ title: "Ticket resolved" });
    },
    onError: () => {
      toast({ title: "Failed to resolve ticket", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages?.messages]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: replyMessage.trim(),
    });
  };

  if (!user || user.userRole !== "admin") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openCount = conversations?.filter(c => c.status === "open").length || 0;
  const escalatedCount = conversations?.filter(c => c.status === "escalated").length || 0;
  const pendingTickets = tickets?.filter(t => t.status === "new" || t.status === "in_progress").length || 0;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Support Inbox
          </h1>
          <p className="text-muted-foreground">Manage customer support conversations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Inbox className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-sm text-muted-foreground">Open Conversations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{escalatedCount}</p>
              <p className="text-sm text-muted-foreground">Escalated</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTickets}</p>
              <p className="text-sm text-muted-foreground">Pending Tickets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conversations">
        <TabsList className="mb-4">
          <TabsTrigger value="conversations" data-testid="tab-conversations">
            Conversations
            {(openCount + escalatedCount) > 0 && (
              <Badge variant="secondary" className="ml-2">{openCount + escalatedCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">
            Tickets
            {pendingTickets > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingTickets}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations">
          {selectedConversation ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConversation(null)}
                      data-testid="button-back-to-list"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedConversation.user?.firstName || "User"} {selectedConversation.user?.lastName || ""}
                        <Badge className={STATUS_COLORS[selectedConversation.status]}>
                          {selectedConversation.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {selectedConversation.user?.email} - {selectedConversation.userRole}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!selectedConversation.assignedAdminId && (
                      <Button
                        onClick={() => assignMutation.mutate(selectedConversation.id)}
                        disabled={assignMutation.isPending}
                        data-testid="button-assign-to-me"
                      >
                        Assign to Me
                      </Button>
                    )}
                    {selectedConversation.status !== "closed" && (
                      <Button
                        variant="outline"
                        onClick={() => closeConversationMutation.mutate(selectedConversation.id)}
                        disabled={closeConversationMutation.isPending}
                        data-testid="button-close-conversation"
                      >
                        Close Conversation
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversationMessages?.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-2",
                            msg.senderType === "admin" ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.senderType !== "admin" && (
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                msg.senderType === "ai"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-accent"
                              )}
                            >
                              {msg.senderType === "ai" ? (
                                <Bot className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                              msg.senderType === "admin"
                                ? "bg-primary text-primary-foreground"
                                : msg.senderType === "ai"
                                ? "bg-muted"
                                : "bg-accent"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          {msg.senderType === "admin" && (
                            <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {selectedConversation.status !== "closed" && (
                  <form onSubmit={handleSendReply} className="p-4 border-t flex gap-2">
                    <Input
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your reply..."
                      disabled={sendMessageMutation.isPending}
                      data-testid="input-admin-reply"
                    />
                    <Button 
                      type="submit" 
                      disabled={!replyMessage.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-admin-reply"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Conversations</CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingConversations ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={`skel-${i}`} className="h-20 w-full" />
                    ))}
                  </div>
                ) : !conversations?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="p-4 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => setSelectedConversation(conv)}
                        data-testid={`conversation-${conv.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {conv.user?.firstName || "User"} {conv.user?.lastName || ""}
                            </span>
                            <Badge className={STATUS_COLORS[conv.status]}>
                              {conv.status}
                            </Badge>
                            {conv.unreadCount > 0 && (
                              <Badge variant="destructive">{conv.unreadCount} new</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(conv.lastActivityAt).toLocaleString()}
                          </span>
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.senderType === "user" ? "User: " : 
                             conv.lastMessage.senderType === "ai" ? "AI: " : "Admin: "}
                            {conv.lastMessage.content.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Escalated issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTickets ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={`ticket-skel-${i}`} className="h-24 w-full" />
                  ))}
                </div>
              ) : !tickets?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tickets found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 border rounded-lg"
                      data-testid={`ticket-${ticket.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{ticket.ticketNumber}</span>
                          <Badge className={TICKET_STATUS_COLORS[ticket.status]}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <Badge className={PRIORITY_COLORS[ticket.priority]}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mb-2">
                        <strong>User:</strong> {ticket.user?.firstName} {ticket.user?.lastName} ({ticket.user?.email})
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">{ticket.reason}</p>
                      
                      {ticket.status !== "resolved" && ticket.status !== "closed" && (
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Resolution notes..."
                            value={ticketNotes}
                            onChange={(e) => setTicketNotes(e.target.value)}
                            className="flex-1"
                            data-testid={`input-ticket-notes-${ticket.id}`}
                          />
                          <Button
                            onClick={() => {
                              resolveTicketMutation.mutate({
                                ticketId: ticket.id,
                                notes: ticketNotes,
                              });
                            }}
                            disabled={!ticketNotes.trim() || resolveTicketMutation.isPending}
                            data-testid={`button-resolve-ticket-${ticket.id}`}
                          >
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
