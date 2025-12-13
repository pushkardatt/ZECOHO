import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  propertyId: string;
  guestId: string;
  lastMessageAt: string;
  unreadCount: number;
  guest: { firstName: string; lastName: string; profileImageUrl?: string };
  property: { title: string };
}

export default function OwnerMessagesPage() {
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/owner/conversations"],
  });

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-messages">
        <Card>
          <CardHeader>
            <CardTitle>Guest Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/messages?conversationId=${conv.id}`}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="flex items-center gap-4 py-4 hover-elevate cursor-pointer rounded-md px-2 -mx-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conv.guest.profileImageUrl} alt={conv.guest.firstName} />
                        <AvatarFallback>
                          {conv.guest.firstName?.[0]}{conv.guest.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {conv.guest.firstName} {conv.guest.lastName}
                          </p>
                          {conv.unreadCount > 0 && (
                            <Badge variant="default" data-testid={`unread-badge-${conv.id}`}>
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.property?.title}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">
                  Guest inquiries will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
