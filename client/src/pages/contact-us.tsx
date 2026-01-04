import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, MapPin, Clock, Building2, Shield, Users, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { ContactSettings } from "@shared/schema";

export default function ContactUs() {
  const { data: settings, isLoading } = useQuery<ContactSettings>({
    queryKey: ["/api/contact-settings"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasCustomerSupport = settings?.customerSupportEmail || settings?.customerSupportPhone;
  const hasOwnerSupport = settings?.ownerSupportEmail || settings?.ownerSupportPhone;
  const hasGrievanceOfficer = settings?.grievanceOfficerName || settings?.grievanceOfficerEmail;
  const hasPrivacyContact = settings?.privacyEmail || settings?.dataProtectionOfficerName;
  const hasBusinessContact = settings?.businessEmail || settings?.businessPhone;
  const hasRegisteredOffice = settings?.registeredOfficeName || settings?.registeredOfficeAddress;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">Contact Us</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have a question or need assistance? We're here to help. 
              Reach out to us through any of the channels below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hasCustomerSupport && (
              <Card data-testid="card-customer-support">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Customer Support
                  </CardTitle>
                  <CardDescription>
                    For booking inquiries, reservations, and general assistance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings?.customerSupportEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${settings.customerSupportEmail}`}
                        className="text-primary hover:underline"
                        data-testid="link-support-email"
                      >
                        {settings.customerSupportEmail}
                      </a>
                    </div>
                  )}
                  {settings?.customerSupportPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${settings.customerSupportPhone.replace(/\s/g, '')}`}
                        className="text-primary hover:underline"
                        data-testid="link-support-phone"
                      >
                        {settings.customerSupportPhone}
                      </a>
                    </div>
                  )}
                  {settings?.customerSupportHours && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground" data-testid="text-support-hours">
                        {settings.customerSupportHours}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasOwnerSupport && (
              <Card data-testid="card-owner-support">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Property Owner Support
                  </CardTitle>
                  <CardDescription>
                    Dedicated support for hoteliers and property partners
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings?.ownerSupportEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${settings.ownerSupportEmail}`}
                        className="text-primary hover:underline"
                        data-testid="link-owner-email"
                      >
                        {settings.ownerSupportEmail}
                      </a>
                    </div>
                  )}
                  {settings?.ownerSupportPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${settings.ownerSupportPhone.replace(/\s/g, '')}`}
                        className="text-primary hover:underline"
                        data-testid="link-owner-phone"
                      >
                        {settings.ownerSupportPhone}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasGrievanceOfficer && (
              <Card className="md:col-span-2" data-testid="card-grievance-officer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Grievance Redressal Officer
                  </CardTitle>
                  <CardDescription>
                    In accordance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {settings?.grievanceOfficerName && (
                        <div>
                          <span className="font-semibold" data-testid="text-grievance-name">
                            {settings.grievanceOfficerName}
                          </span>
                          <p className="text-sm text-muted-foreground">Grievance Redressal Officer</p>
                        </div>
                      )}
                      {settings?.grievanceOfficerEmail && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${settings.grievanceOfficerEmail}`}
                            className="text-primary hover:underline"
                            data-testid="link-grievance-email"
                          >
                            {settings.grievanceOfficerEmail}
                          </a>
                        </div>
                      )}
                      {settings?.grievanceOfficerPhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`tel:${settings.grievanceOfficerPhone.replace(/\s/g, '')}`}
                            className="text-primary hover:underline"
                            data-testid="link-grievance-phone"
                          >
                            {settings.grievanceOfficerPhone}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {settings?.grievanceOfficerAddress && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                          <span className="text-muted-foreground whitespace-pre-line" data-testid="text-grievance-address">
                            {settings.grievanceOfficerAddress}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="bg-muted/50 rounded-md p-4">
                    <p className="text-sm text-muted-foreground">
                      Complaints will be acknowledged within <strong>48 hours</strong> and 
                      resolved within <strong>1 month</strong> from the date of receipt, 
                      in accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {hasPrivacyContact && (
              <Card data-testid="card-privacy-contact">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Privacy & Data Protection
                  </CardTitle>
                  <CardDescription>
                    For data privacy inquiries and data deletion requests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings?.dataProtectionOfficerName && (
                    <div>
                      <span className="font-semibold" data-testid="text-dpo-name">
                        {settings.dataProtectionOfficerName}
                      </span>
                      <p className="text-sm text-muted-foreground">Data Protection Officer</p>
                    </div>
                  )}
                  {settings?.privacyEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${settings.privacyEmail}`}
                        className="text-primary hover:underline"
                        data-testid="link-privacy-email"
                      >
                        {settings.privacyEmail}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasBusinessContact && (
              <Card data-testid="card-business-contact">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Business & Partnerships
                  </CardTitle>
                  <CardDescription>
                    For business partnerships, press, and media inquiries
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings?.businessEmail && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${settings.businessEmail}`}
                        className="text-primary hover:underline"
                        data-testid="link-business-email"
                      >
                        {settings.businessEmail}
                      </a>
                    </div>
                  )}
                  {settings?.businessPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${settings.businessPhone.replace(/\s/g, '')}`}
                        className="text-primary hover:underline"
                        data-testid="link-business-phone"
                      >
                        {settings.businessPhone}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasRegisteredOffice && (
              <Card className={!hasPrivacyContact && !hasBusinessContact ? "md:col-span-2" : ""} data-testid="card-registered-office">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Registered Office
                  </CardTitle>
                  <CardDescription>
                    Company's registered address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {settings?.registeredOfficeName && (
                      <p className="font-semibold" data-testid="text-company-name">
                        {settings.registeredOfficeName}
                      </p>
                    )}
                    <div className="text-muted-foreground mt-2 space-y-1">
                      {settings?.registeredOfficeAddress && (
                        <p className="whitespace-pre-line">{settings.registeredOfficeAddress}</p>
                      )}
                      <p>
                        {[
                          settings?.registeredOfficeCity,
                          settings?.registeredOfficeState,
                          settings?.registeredOfficePincode,
                        ].filter(Boolean).join(", ")}
                      </p>
                      {settings?.registeredOfficeCountry && (
                        <p>{settings.registeredOfficeCountry}</p>
                      )}
                    </div>
                  </div>
                  
                  {settings?.companyRegistrationNumber && (
                    <>
                      <Separator />
                      <div className="text-sm">
                        <span className="text-muted-foreground">CIN: </span>
                        <span className="font-mono" data-testid="text-cin">{settings.companyRegistrationNumber}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

        {!hasCustomerSupport && !hasOwnerSupport && !hasGrievanceOfficer && 
         !hasPrivacyContact && !hasBusinessContact && !hasRegisteredOffice && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Contact information is being set up. Please check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
