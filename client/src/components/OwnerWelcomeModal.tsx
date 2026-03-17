import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  MessageSquare,
  TrendingUp,
  Home,
  LayoutDashboard,
} from "lucide-react";

interface OwnerWelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export function OwnerWelcomeModal({ open, onClose }: OwnerWelcomeModalProps) {
  const [, setLocation] = useLocation();

  const dismissMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/user/dismiss-owner-modal");
    },
    onSuccess: () => {},
  });

  const handleGoToDashboard = () => {
    dismissMutation.mutate();
    onClose();
    setLocation("/owner/dashboard");
  };

  const handleSwitchToCustomer = () => {
    dismissMutation.mutate();
    onClose();
    setLocation("/");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="owner-welcome-modal">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl" data-testid="owner-welcome-title">
            You're now a ZECOHO Property Owner
          </DialogTitle>
          <DialogDescription className="text-base">
            Welcome to the ZECOHO Owner Portal! As a property owner, you can
            manage your listings, connect with guests, and grow your business
            with zero commission fees.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Manage Your Properties</h4>
              <p className="text-sm text-muted-foreground">
                List, update, and control your property listings with ease
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Connect with Guests</h4>
              <p className="text-sm text-muted-foreground">
                Receive bookings and communicate directly with travelers
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Real-time Messaging</h4>
              <p className="text-sm text-muted-foreground">
                Chat with guests instantly to answer questions and confirm
                details
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Zero Commission</h4>
              <p className="text-sm text-muted-foreground">
                Keep 100% of your earnings - no platform fees or hidden charges
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSwitchToCustomer}
            className="flex-1"
            data-testid="button-switch-customer"
          >
            <Home className="h-4 w-4 mr-2" />
            Switch to Customer View
          </Button>
          <Button
            onClick={handleGoToDashboard}
            className="flex-1"
            data-testid="button-go-dashboard"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Go to Owner Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
