import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversation, Message, User, Property } from "@shared/schema";

type ConversationWithDetails = Conversation & {
  property: Property;
  guest: User;
  owner: User;
  unreadCount: number;
};

type MessageWithSender = Message & {
  sender: User;
};

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('conversationId');
    }
    return null;
  });
  const [messageInput, setMessageInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const selectedConversationIdRef = useRef(selectedConversationId);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "new_message") {
            // If we're viewing this conversation, instantly add the message to display
            if (data.conversationId === selectedConversationIdRef.current && data.message) {
              queryClient.setQueryData(
                ["/api/conversations", selectedConversationIdRef.current, "messages"],
                (old: MessageWithSender[] = []) => {
                  // Avoid duplicates
                  if (old.some(m => m.id === data.message.id)) return old;
                  return [...old, data.message];
                }
              );
            }
            
            // Show toast notification for new message
            const senderName = data.message?.sender?.firstName 
              ? `${data.message.sender.firstName} ${data.message.sender.lastName || ''}`.trim()
              : 'Someone';
            const messagePreview = data.message?.content?.substring(0, 50) || 'New message';
            toast({
              title: `New message from ${senderName}`,
              description: messagePreview + (data.message?.content?.length > 50 ? '...' : ''),
            });
            
            // Refresh conversations list to update unread counts
            queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3s...");
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user?.id]);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: messages = [], isLoading: messagesLoading, isSuccess: messagesSuccess } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
  });

  useEffect(() => {
    if (messagesSuccess && selectedConversationId) {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  }, [messagesSuccess, selectedConversationId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversationId) return null;
      const response = await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, { content });
      return await response.json() as MessageWithSender;
    },
    onSuccess: (newMessage) => {
      if (newMessage && selectedConversationId) {
        queryClient.setQueryData(
          ["/api/conversations", selectedConversationId, "messages"],
          (old: MessageWithSender[] = []) => {
            if (old.some(m => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageInput("");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && selectedConversationId) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const isGuest = user?.userRole === "guest";
  const otherParticipant = selectedConversation
    ? isGuest
      ? selectedConversation.owner
      : selectedConversation.guest
    : null;

  const getInitials = (user: User | null) => {
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || "?";
  };

  const getUserDisplayName = (user: User | null) => {
    if (!user) return "Unknown";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || "Unknown";
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please log in to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-96 border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-semibold">Messages</h1>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start messaging property owners about their listings</p>
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conversation) => {
                const participant = isGuest ? conversation.owner : conversation.guest;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full p-4 text-left hover-elevate active-elevate-2 transition-colors ${
                      selectedConversationId === conversation.id ? "bg-accent" : ""
                    }`}
                    data-testid={`conversation-${conversation.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={participant.profileImageUrl || undefined} />
                        <AvatarFallback>{getInitials(participant)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium truncate">{getUserDisplayName(participant)}</h3>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="shrink-0" data-testid={`unread-badge-${conversation.id}`}>
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conversation.property.title}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar>
                <AvatarImage src={otherParticipant?.profileImageUrl || undefined} />
                <AvatarFallback>{getInitials(otherParticipant)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="font-semibold">{getUserDisplayName(otherParticipant)}</h2>
                {selectedConversation && (
                  <p className="text-sm text-muted-foreground">{selectedConversation.property.title}</p>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="text-center text-muted-foreground">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isCurrentUser = message.senderId === user.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div className={`flex gap-2 max-w-[70%] ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={message.sender.profileImageUrl || undefined} />
                            <AvatarFallback>{getInitials(message.sender)}</AvatarFallback>
                          </Avatar>
                          <Card className={`p-3 ${isCurrentUser ? "bg-primary text-primary-foreground" : ""}`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <p className={`text-xs mt-1 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {new Date(message.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
