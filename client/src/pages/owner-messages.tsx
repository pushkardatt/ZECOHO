import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { MessageSquare, Send, Search, XCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: number;
  guestId: string;
  guestName: string;
  guestImage?: string;
  propertyTitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isOwner: boolean;
}

export default function OwnerMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const selectedConversationRef = useRef(selectedConversation);

  const isRejected = user?.kycStatus === "rejected";
  const isVerified = user?.kycStatus === "verified";

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (!user?.id || !isVerified) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Owner WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "new_message") {
            // If viewing this conversation, add message to display instantly
            if (data.conversationId && String(data.conversationId) === String(selectedConversationRef.current) && data.message) {
              queryClient.setQueryData(
                ["/api/owner/conversations", selectedConversationRef.current, "messages"],
                (old: Message[] = []) => {
                  if (old.some(m => String(m.id) === String(data.message.id))) return old;
                  return [...old, data.message];
                }
              );
            }
            
            // Show toast notification for new message
            const senderName = data.message?.sender?.firstName 
              ? `${data.message.sender.firstName} ${data.message.sender.lastName || ''}`.trim()
              : 'Guest';
            const messagePreview = data.message?.content?.substring(0, 50) || 'New message';
            toast({
              title: `New message from ${senderName}`,
              description: messagePreview + (data.message?.content?.length > 50 ? '...' : ''),
            });
            
            // Refresh conversations list to update unread counts
            queryClient.invalidateQueries({ queryKey: ["/api/owner/conversations"] });
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      ws.onclose = () => {
        console.log("Owner WebSocket disconnected, reconnecting in 3s...");
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("Owner WebSocket error:", error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.id, isVerified]);

  const { data: conversations, isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/owner/conversations"],
    enabled: !authLoading && isVerified,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["/api/owner/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation && !authLoading && isVerified,
  });

  const filteredConversations = conversations?.filter(
    (conv) =>
      conv.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    setMessageText("");
  };

  if (authLoading) {
    return (
      <OwnerLayout>
        <div className="h-[calc(100vh-8rem)]" data-testid="owner-messages-loading">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <Card className="md:col-span-1 flex flex-col">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="flex-1 p-4">
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
            <Card className="md:col-span-2 flex flex-col">
              <CardContent className="flex-1 flex items-center justify-center">
                <Skeleton className="h-16 w-16 rounded-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  if (isRejected) {
    return (
      <OwnerLayout>
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center" data-testid="owner-messages-blocked">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-950/30">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Messaging Unavailable</h3>
                  <p className="text-muted-foreground text-sm">
                    Your KYC verification was rejected. You cannot access messages until your KYC is approved.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <Link href="/owner/kyc" className="flex-1">
                    <Button className="w-full" data-testid="btn-review-kyc">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Review KYC Status
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </OwnerLayout>
    );
  }

  if (!isVerified) {
    return (
      <OwnerLayout>
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center" data-testid="owner-messages-pending">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950/30">
                  <MessageSquare className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Messaging Coming Soon</h3>
                  <p className="text-muted-foreground text-sm">
                    Complete your KYC verification to access guest messages and start communicating with potential guests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="h-[calc(100vh-8rem)]" data-testid="owner-messages">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conversations</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="search-conversations"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {loadingConversations ? (
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : filteredConversations && filteredConversations.length > 0 ? (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        className={`w-full p-4 text-left hover-elevate ${
                          selectedConversation === conv.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedConversation(conv.id)}
                        data-testid={`conversation-${conv.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.guestImage} alt={conv.guestName} />
                            <AvatarFallback>
                              {conv.guestName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{conv.guestName}</p>
                              {conv.unreadCount > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.propertyTitle}
                            </p>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {conv.lastMessage}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">No conversations yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col">
            {selectedConversation && selectedConv ? (
              <>
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConv.guestImage} alt={selectedConv.guestName} />
                      <AvatarFallback>
                        {selectedConv.guestName.split(" ").map((n) => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{selectedConv.guestName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedConv.propertyTitle}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-4">
                    {loadingMessages ? (
                      <div className="space-y-4">
                        <Skeleton className="h-16 w-3/4" />
                        <Skeleton className="h-16 w-3/4 ml-auto" />
                        <Skeleton className="h-16 w-3/4" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.isOwner ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.isOwner
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                              data-testid={`message-${msg.id}`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {format(new Date(msg.createdAt), "HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No messages yet</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      data-testid="message-input"
                    />
                    <Button onClick={handleSendMessage} data-testid="send-message">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex flex-col items-center justify-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Select a conversation to start messaging
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </OwnerLayout>
  );
}
