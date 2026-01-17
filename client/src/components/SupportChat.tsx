import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2, 
  Maximize2, 
  Bot, 
  User, 
  ShieldCheck,
  Loader2,
  Calendar,
  BadgePercent,
  XCircle,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface SupportConversation {
  id: string;
  userId: string;
  status: "open" | "escalated" | "closed";
  subject?: string;
  createdAt: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
}

const iconMap: Record<string, any> = {
  Calendar,
  BadgePercent,
  XCircle,
  Phone,
};

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: quickActions } = useQuery<QuickAction[]>({
    queryKey: ["/api/support/quick-actions"],
    enabled: isOpen,
  });

  const { data: conversationData, isLoading: isLoadingConversation } = useQuery<{
    conversation: SupportConversation;
    messages: SupportMessage[];
  }>({
    queryKey: ["/api/support/conversations/active"],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/support/conversations", {});
      return res.json();
    },
    enabled: isOpen,
    staleTime: 0,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content?: string; quickActionId?: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/support/conversations/${conversationData?.conversation.id}/messages`,
        data
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/conversations/active"] });
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const closeConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/support/conversations/${conversationData?.conversation.id}/close`,
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/conversations/active"] });
      setIsOpen(false);
      toast({
        title: "Conversation Closed",
        description: "Thank you for contacting support!",
      });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationData?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationData?.conversation) return;
    sendMessageMutation.mutate({ content: message.trim() });
  };

  const handleQuickAction = (actionId: string) => {
    if (!conversationData?.conversation) return;
    sendMessageMutation.mutate({ quickActionId: actionId, content: actionId });
  };

  const renderMessageContent = (content: string) => {
    return content.split("\n").map((line, i) => (
      <span key={`line-${i}`}>
        {line.startsWith("•") || line.startsWith("-") ? (
          <span className="block ml-2">{line}</span>
        ) : line.startsWith("**") ? (
          <strong>{line.replace(/\*\*/g, "")}</strong>
        ) : (
          line
        )}
        {i < content.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        data-testid="button-open-support-chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed z-50 shadow-2xl transition-all duration-300 flex flex-col",
        isMinimized
          ? "bottom-20 right-4 w-80 h-14"
          : "bottom-4 right-4 w-96 h-[600px] max-h-[80vh]"
      )}
      data-testid="support-chat-widget"
    >
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold">ZECOHO Support</span>
          {conversationData?.conversation.status === "escalated" && (
            <Badge variant="secondary" className="text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Agent Assigned
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
            onClick={() => setIsMinimized(!isMinimized)}
            data-testid="button-minimize-chat"
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary/80"
            onClick={() => setIsOpen(false)}
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 p-4">
            {isLoadingConversation ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {conversationData?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.senderType === "user" ? "justify-end" : "justify-start"
                    )}
                    data-testid={`message-${msg.senderType}-${msg.id}`}
                  >
                    {msg.senderType !== "user" && (
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          msg.senderType === "ai"
                            ? "bg-primary/10 text-primary"
                            : "bg-green-100 text-green-700"
                        )}
                      >
                        {msg.senderType === "ai" ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        msg.senderType === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {renderMessageContent(msg.content)}
                    </div>
                    {msg.senderType === "user" && (
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {conversationData?.messages.length === 1 && quickActions && (
            <div className="p-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const IconComponent = iconMap[action.icon] || MessageCircle;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-auto py-2"
                      onClick={() => handleQuickAction(action.id)}
                      disabled={sendMessageMutation.isPending}
                      data-testid={`quick-action-${action.id}`}
                    >
                      <IconComponent className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {conversationData?.conversation.status === "closed" ? (
            <div className="p-3 border-t text-center">
              <p className="text-sm text-muted-foreground mb-2">
                This conversation has ended.
              </p>
              <Button
                onClick={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["/api/support/conversations/active"],
                  });
                }}
                size="sm"
                data-testid="button-new-conversation"
              >
                Start New Conversation
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-support-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  Powered by ZECOHO AI
                </span>
                {conversationData?.conversation && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-auto py-1"
                    onClick={() => closeConversationMutation.mutate()}
                    disabled={closeConversationMutation.isPending}
                    data-testid="button-end-conversation"
                  >
                    End Chat
                  </Button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}
