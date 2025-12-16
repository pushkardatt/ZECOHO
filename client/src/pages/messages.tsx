import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useKycGuard } from "@/hooks/useKycGuard";
import { RestrictedAccess } from "@/components/RestrictedAccess";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Send, MessageCircle, Paperclip, X, Image, FileText, Film, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BookingActionCard } from "@/components/BookingActionCard";
import type { Conversation, Message, User, Property, MessageAttachment, Booking } from "@shared/schema";

type PendingAttachment = {
  file: File;
  preview: string;
  uploading: boolean;
  accessPath?: string;
  uploadToken?: string;
};

type ConversationWithDetails = Conversation & {
  property: Property;
  guest: User;
  owner: User;
  unreadCount: number;
};

type MessageWithSender = Message & {
  sender: User;
  booking?: Booking;
};

export default function Messages() {
  const { user, isOwner } = useAuth();
  const { toast } = useToast();
  const { shouldBlockAccess } = useKycGuard();

  // Block access for rejected owners
  if (isOwner && shouldBlockAccess) {
    return <RestrictedAccess description="Your KYC has been rejected. Please fix your KYC to access messages." />;
  }
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('conversationId');
    }
    return null;
  });
  const [messageInput, setMessageInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const userIdRef = useRef(user?.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync with state
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

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
            
            // Show toast notification for new message only if it's from someone else
            const senderId = data.message?.senderId || data.message?.sender?.id;
            if (senderId && senderId !== userIdRef.current) {
              const senderName = data.message?.sender?.firstName 
                ? `${data.message.sender.firstName} ${data.message.sender.lastName || ''}`.trim()
                : 'Someone';
              const messagePreview = data.message?.content?.substring(0, 50) || 'New message';
              toast({
                title: `New message from ${senderName}`,
                description: messagePreview + (data.message?.content?.length > 50 ? '...' : ''),
              });
            }
            
            // Refresh conversations list to update unread counts (without auto-refetch to prevent message flicker)
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
    refetchOnMount: "always",
    staleTime: 0,
  });

  const { data: messages = [], isLoading: messagesLoading, isSuccess: messagesSuccess } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
    refetchOnMount: "always",
    staleTime: 0,
  });


  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 25 * 1024 * 1024; // 25MB max
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 25MB limit`,
          variant: "destructive",
        });
        continue;
      }
      
      if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        continue;
      }

      const preview = file.type.startsWith('image/') || file.type.startsWith('video/')
        ? URL.createObjectURL(file)
        : '';

      setPendingAttachments(prev => [...prev, {
        file,
        preview,
        uploading: false,
      }]);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove pending attachment
  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  // Upload a single attachment
  const uploadAttachment = async (attachment: PendingAttachment): Promise<MessageAttachment | null> => {
    try {
      // Get upload URL
      const uploadResponse = await apiRequest("POST", "/api/messages/upload", {});
      const { uploadURL, accessPath, uploadToken } = await uploadResponse.json();

      // Upload file directly to storage
      const uploadResult = await fetch(uploadURL, {
        method: "PUT",
        body: attachment.file,
        headers: {
          "Content-Type": attachment.file.type,
        },
      });

      if (!uploadResult.ok) {
        throw new Error("Upload failed");
      }

      // Finalize upload (set ACL)
      await apiRequest("POST", "/api/messages/upload/finalize", {
        accessPath,
        uploadToken,
        conversationId: selectedConversationId,
      });

      return {
        id: crypto.randomUUID(),
        fileName: attachment.file.name,
        fileType: attachment.file.type,
        fileSize: attachment.file.size,
        url: accessPath,
      };
    } catch (error) {
      console.error("Error uploading attachment:", error);
      return null;
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments: MessageAttachment[] }) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, { 
        content: content || (attachments.length > 0 ? "Sent attachment(s)" : ""),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      return await response.json() as MessageWithSender;
    },
    onSuccess: (newMessage) => {
      console.log("[MESSAGE] Send success, newMessage:", newMessage);
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
      setPendingAttachments([]);
      setTimeout(() => messageInputRef.current?.focus(), 0);
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !selectedConversationId) return;
    
    setIsSending(true);
    
    try {
      // Upload all attachments first
      const uploadedAttachments: MessageAttachment[] = [];
      for (const attachment of pendingAttachments) {
        const result = await uploadAttachment(attachment);
        if (result) {
          uploadedAttachments.push(result);
        }
      }
      
      // Send message with attachments
      sendMessageMutation.mutate({ 
        content: messageInput.trim(), 
        attachments: uploadedAttachments 
      });
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Helper to get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Film className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
                    
                    // Check if this is a booking-related message
                    if ((message.messageType === "booking_request" || message.messageType === "booking_update") && message.booking) {
                      return (
                        <div key={message.id} className="max-w-[85%]" data-testid={`message-${message.id}`}>
                          <p className="text-xs text-muted-foreground mb-2">
                            {isCurrentUser ? 'You' : `${message.sender?.firstName || 'Owner'}`} • {new Date(message.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {message.content && (
                            <p className="text-sm text-muted-foreground mb-2">{message.content}</p>
                          )}
                          <BookingActionCard 
                            booking={message.booking as any}
                            isOwner={false}
                            onStatusChange={() => {
                              queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId, "messages"] });
                            }}
                          />
                        </div>
                      );
                    }
                    
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
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {message.attachments.map((att: MessageAttachment) => (
                                  <div key={att.id} className="rounded-md overflow-hidden">
                                    {att.fileType.startsWith('image/') ? (
                                      <img 
                                        src={att.url} 
                                        alt={att.fileName}
                                        className="max-w-full max-h-48 rounded cursor-pointer hover:opacity-90"
                                        onClick={() => setPreviewImage(att.url)}
                                        data-testid={`attachment-image-${att.id}`}
                                      />
                                    ) : att.fileType.startsWith('video/') ? (
                                      <video 
                                        src={att.url} 
                                        controls 
                                        className="max-w-full max-h-48 rounded"
                                        data-testid={`attachment-video-${att.id}`}
                                      />
                                    ) : (
                                      <a 
                                        href={att.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 p-2 rounded border ${isCurrentUser ? 'border-primary-foreground/20 hover:bg-primary-foreground/10' : 'border-border hover:bg-muted'}`}
                                        data-testid={`attachment-file-${att.id}`}
                                      >
                                        {getFileIcon(att.fileType)}
                                        <span className="text-sm truncate flex-1">{att.fileName}</span>
                                        <span className="text-xs opacity-70">{formatFileSize(att.fileSize)}</span>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.content && message.content !== "Sent attachment(s)" && (
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                            <p className={`text-xs mt-1 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {new Date(message.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </Card>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-4 border-t">
              {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {pendingAttachments.map((att, index) => (
                    <div key={index} className="relative group">
                      {att.file.type.startsWith('image/') ? (
                        <img src={att.preview} alt={att.file.name} className="h-16 w-16 object-cover rounded border" />
                      ) : att.file.type.startsWith('video/') ? (
                        <div className="h-16 w-16 bg-muted rounded border flex items-center justify-center">
                          <Film className="h-6 w-6 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded border flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAttachment(index)}
                        data-testid={`button-remove-attachment-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="text-xs text-muted-foreground truncate w-16 mt-1">{att.file.name}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  className="hidden"
                  data-testid="input-file-attachment"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || sendMessageMutation.isPending}
                  data-testid="button-attach-file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={messageInputRef}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isSending || sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={(!messageInput.trim() && pendingAttachments.length === 0) || isSending || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
