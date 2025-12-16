import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { MessageSquare, Send, Search, XCircle, AlertTriangle, Paperclip, X, Image, FileText, Film, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import type { Conversation as BaseConversation, Message as BaseMessage, User, Property, MessageAttachment, Booking } from "@shared/schema";
import { BookingActionCard } from "@/components/BookingActionCard";

type PendingAttachment = {
  file: File;
  preview: string;
  uploading: boolean;
  accessPath?: string;
  uploadToken?: string;
};

type ConversationWithDetails = BaseConversation & {
  property: Property;
  guest: User;
  owner: User;
  unreadCount: number;
};

type MessageWithSender = BaseMessage & {
  sender: User;
  booking?: Booking;
};

export default function OwnerMessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedConversationRef = useRef(selectedConversation);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef(user?.id);

  const isRejected = user?.kycStatus === "rejected";
  const isVerified = user?.kycStatus === "verified";
  const isPending = user?.kycStatus === "pending";

  // Fetch conversation count for non-verified users (to show notification)
  const { data: conversationCount } = useQuery<{
    totalConversations: number;
    unreadCount: number;
    hasEnquiries: boolean;
  }>({
    queryKey: ["/api/owner/conversations/count"],
    enabled: !authLoading && !!user && !isVerified,
  });

  // Keep refs in sync with state
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

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
                ["/api/conversations", selectedConversationRef.current, "messages"],
                (old: MessageWithSender[] = []) => {
                  if (old.some(m => String(m.id) === String(data.message.id))) return old;
                  return [...old, data.message];
                }
              );
            }
            
            // Show toast notification for new message only if it's from someone else
            const senderId = data.message?.senderId || data.message?.sender?.id;
            if (senderId && senderId !== userIdRef.current) {
              const senderName = data.message?.sender?.firstName 
                ? `${data.message.sender.firstName} ${data.message.sender.lastName || ''}`.trim()
                : 'Guest';
              const messagePreview = data.message?.content?.substring(0, 50) || 'New message';
              toast({
                title: `New message from ${senderName}`,
                description: messagePreview + (data.message?.content?.length > 50 ? '...' : ''),
              });
            }
            
            // Refresh conversations list to update unread counts (without auto-refetch to prevent message flicker)
            queryClient.invalidateQueries({ queryKey: ["/api/owner/conversations"], refetchType: 'none' });
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

  const { data: conversations, isLoading: loadingConversations } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/owner/conversations"],
    enabled: !authLoading && isVerified,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    enabled: !!selectedConversation && !authLoading && isVerified,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments: MessageAttachment[] }) => {
      if (!selectedConversation) throw new Error("No conversation selected");
      const response = await apiRequest("POST", `/api/conversations/${selectedConversation}/messages`, { 
        content: content || (attachments.length > 0 ? "Sent attachment(s)" : ""),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      return await response.json() as MessageWithSender;
    },
    onSuccess: (newMessage) => {
      console.log("[OWNER MESSAGE] Send success, newMessage:", newMessage);
      if (newMessage && selectedConversation) {
        queryClient.setQueryData(
          ["/api/conversations", selectedConversation, "messages"],
          (old: MessageWithSender[] = []) => {
            if (old.some(m => m.id === newMessage.id)) return old;
            return [...old, newMessage];
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/owner/conversations"], refetchType: 'none' });
      setMessageText("");
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

  const getGuestDisplayName = (guest: User | null) => {
    if (!guest) return "Unknown";
    if (guest.firstName && guest.lastName) {
      return `${guest.firstName} ${guest.lastName}`;
    }
    return guest.email || "Unknown";
  };

  const getInitials = (user: User | null) => {
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || "?";
  };

  const filteredConversations = conversations?.filter(
    (conv) => {
      const guestName = getGuestDisplayName(conv.guest).toLowerCase();
      const propertyTitle = conv.property?.title?.toLowerCase() || "";
      return guestName.includes(searchQuery.toLowerCase()) ||
        propertyTitle.includes(searchQuery.toLowerCase());
    }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 25 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        toast({ title: "File too large", description: `${file.name} exceeds 25MB limit`, variant: "destructive" });
        continue;
      }
      
      if (!allowedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
        toast({ title: "Unsupported file type", description: `${file.name} is not supported`, variant: "destructive" });
        continue;
      }

      const preview = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : '';
      setPendingAttachments(prev => [...prev, { file, preview, uploading: false }]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadAttachment = async (attachment: PendingAttachment): Promise<MessageAttachment | null> => {
    try {
      const uploadResponse = await apiRequest("POST", "/api/messages/upload", {});
      const { uploadURL, accessPath, uploadToken } = await uploadResponse.json();
      const uploadResult = await fetch(uploadURL, { method: "PUT", body: attachment.file, headers: { "Content-Type": attachment.file.type } });
      if (!uploadResult.ok) throw new Error("Upload failed");
      await apiRequest("POST", "/api/messages/upload/finalize", { accessPath, uploadToken, conversationId: selectedConversation });
      return { id: crypto.randomUUID(), fileName: attachment.file.name, fileType: attachment.file.type, fileSize: attachment.file.size, url: accessPath };
    } catch (error) { console.error("Error uploading:", error); return null; }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Film className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && pendingAttachments.length === 0) || !selectedConversation) return;
    
    setIsSending(true);
    
    try {
      const uploadedAttachments: MessageAttachment[] = [];
      for (const attachment of pendingAttachments) {
        const result = await uploadAttachment(attachment);
        if (result) {
          uploadedAttachments.push(result);
        }
      }
      
      sendMessageMutation.mutate({ 
        content: messageText.trim(), 
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
                  {conversationCount?.hasEnquiries && (
                    <div className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>{conversationCount.totalConversations}</strong> enquir{conversationCount.totalConversations === 1 ? 'y' : 'ies'} waiting
                        {conversationCount.unreadCount > 0 && (
                          <> ({conversationCount.unreadCount} unread)</>
                        )}
                      </p>
                    </div>
                  )}
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
                  <h3 className="font-semibold text-lg">
                    {isPending ? "KYC Under Review" : "Messaging Coming Soon"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {isPending 
                      ? "Your KYC verification is being reviewed. You'll be able to access messages once approved."
                      : "Complete your KYC verification to access guest messages and start communicating with potential guests."
                    }
                  </p>
                  {conversationCount?.hasEnquiries && (
                    <div className="mt-3 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>{conversationCount.totalConversations}</strong> enquir{conversationCount.totalConversations === 1 ? 'y' : 'ies'} waiting for you!
                        {conversationCount.unreadCount > 0 && (
                          <> ({conversationCount.unreadCount} unread)</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {!isPending && (
                  <Link href="/owner/choose-mode" className="w-full">
                    <Button className="w-full" data-testid="btn-complete-kyc">
                      Complete KYC Verification
                    </Button>
                  </Link>
                )}
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
                            <AvatarImage src={conv.guest?.profileImageUrl || undefined} alt={getGuestDisplayName(conv.guest)} />
                            <AvatarFallback>
                              {getInitials(conv.guest)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{getGuestDisplayName(conv.guest)}</p>
                              {conv.unreadCount > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {conv.property?.title}
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
                      <AvatarImage src={selectedConv.guest?.profileImageUrl || undefined} alt={getGuestDisplayName(selectedConv.guest)} />
                      <AvatarFallback>
                        {getInitials(selectedConv.guest)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{getGuestDisplayName(selectedConv.guest)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedConv.property?.title}</p>
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
                        {messages.map((msg) => {
                          const isCurrentUser = msg.senderId === user?.id;
                          
                          // Check if this is a booking-related message
                          if ((msg.messageType === "booking_request" || msg.messageType === "booking_update") && msg.booking) {
                            return (
                              <div key={msg.id} className="max-w-[85%]">
                                <p className="text-xs text-muted-foreground mb-2">
                                  {!isCurrentUser ? `${msg.sender?.firstName || 'Guest'}` : 'You'} • {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                                </p>
                                {msg.content && (
                                  <p className="text-sm text-muted-foreground mb-2">{msg.content}</p>
                                )}
                                <BookingActionCard 
                                  booking={msg.booking as any}
                                  isOwner={true}
                                  onStatusChange={() => {
                                    queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
                                  }}
                                />
                              </div>
                            );
                          }
                          
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  isCurrentUser
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                                data-testid={`message-${msg.id}`}
                              >
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="space-y-2 mb-2">
                                    {msg.attachments.map((att: MessageAttachment) => (
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
                                {msg.content && msg.content !== "Sent attachment(s)" && (
                                  <p className="text-sm">{msg.content}</p>
                                )}
                                <p className="text-xs opacity-70 mt-1">
                                  {msg.createdAt ? format(new Date(msg.createdAt), "HH:mm") : ""}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
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
                      disabled={isSending}
                      data-testid="button-attach-file"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      ref={messageInputRef}
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      disabled={isSending}
                      data-testid="message-input"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={(!messageText.trim() && pendingAttachments.length === 0) || isSending}
                      data-testid="send-message"
                    >
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

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto" />
          )}
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
