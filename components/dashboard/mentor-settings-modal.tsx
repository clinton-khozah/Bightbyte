"use client";

import * as React from "react";
import {
  X,
  Save,
  Loader2,
  CheckCircle2,
  Settings,
  User,
  ArrowLeft,
  Upload,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

interface MentorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
  onUpdate?: () => void;
}

export function MentorSettingsModal({
  isOpen,
  onClose,
  userData,
  onUpdate,
}: MentorSettingsModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("profile");
  const [logoUploading, setLogoUploading] = React.useState(false);

  // Profile form state - focused on job posting
  const [profileData, setProfileData] = React.useState({
    company_name: userData?.company_name || userData?.name || "",
    description: userData?.description || userData?.bio || "",
    company_logo: userData?.company_logo || userData?.avatar || null,
  });

  // Account settings
  const [accountSettings, setAccountSettings] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  React.useEffect(() => {
    if (userData) {
      setProfileData({
        company_name: userData?.company_name || userData?.name || "",
        description: userData?.description || userData?.bio || "",
        company_logo: userData?.company_logo || userData?.avatar || null,
      });
    }
  }, [userData]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLogoUploading(true);
      const fileExt = file.name.split(".").pop();
      const sanitizedCompanyId = (userData?.id || "company")
        .toString()
        .replace(/[^a-zA-Z0-9]/g, "_");
      const timestamp = Date.now();
      const fileName = `company_logo_${sanitizedCompanyId}_${timestamp}.${fileExt}`;
      const filePath = `company-logos/${sanitizedCompanyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      setProfileData((prev) => ({ ...prev, company_logo: publicUrl }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userData) return;

    try {
      setIsLoading(true);

      const updates: Record<string, any> = {
        name: profileData.company_name.trim(),
        company_name: profileData.company_name.trim(),
        description: profileData.description.trim(),
        bio: profileData.description.trim(),
        updated_at: new Date().toISOString(),
      };

      // Update logo if changed
      if (profileData.company_logo) {
        updates.avatar = profileData.company_logo;
        updates.company_logo = profileData.company_logo;
      }

      const { error } = await supabase
        .from("mentors")
        .update(updates)
        .eq("user_id", userData.id);

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onUpdate) onUpdate();
      }, 2000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      setIsLoading(true);

      if (
        accountSettings.newPassword &&
        accountSettings.newPassword !== accountSettings.confirmPassword
      ) {
        alert("New passwords don't match");
        return;
      }

      if (accountSettings.newPassword) {
        const { error } = await supabase.auth.updateUser({
          password: accountSettings.newPassword,
        });
        if (error) throw error;
      }

      setAccountSettings({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error updating account:", error);
      alert("Error updating account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
          animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
          exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            width: "95%",
            maxWidth: "48rem",
            maxHeight: "95vh",
          }}
          className="overflow-hidden bg-white rounded-xl shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-3 md:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 md:gap-2 text-gray-500 hover:text-gray-700 mb-2 md:mb-4 transition-colors group"
            >
              <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs md:text-sm font-medium">
                Back to Dashboard
              </span>
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">
                  Settings
                </h2>
                <p className="text-xs md:text-sm text-gray-600">
                  Manage your job posting settings and account
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-3 md:mx-6 mt-2 md:mt-4 p-2 md:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-1.5 md:gap-2 text-green-800"
            >
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="text-xs md:text-sm">
                Settings saved successfully!
              </span>
            </motion.div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-8 h-9 md:h-10">
                <TabsTrigger
                  value="profile"
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
                >
                  <Building2 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Company Profile</span>
                  <span className="sm:hidden">Profile</span>
                </TabsTrigger>
                <TabsTrigger
                  value="account"
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
                >
                  <Settings className="w-3 h-3 md:w-4 md:h-4" />
                  Account
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-3 md:space-y-6">
                <Card>
                  <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-base md:text-lg">
                      Company Information
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Update your company details for job postings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6">
                    {/* Company Logo */}
                    <div>
                      <Label
                        htmlFor="logo"
                        className="text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2 block"
                      >
                        Company Logo
                      </Label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
                        {profileData.company_logo ? (
                          <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0">
                            <Image
                              src={profileData.company_logo}
                              alt="Company logo"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 w-full sm:w-auto">
                          <input
                            type="file"
                            id="logo"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              document.getElementById("logo")?.click()
                            }
                            disabled={logoUploading}
                            className="w-full sm:w-auto h-8 md:h-10 text-xs md:text-sm"
                          >
                            {logoUploading ? (
                              <>
                                <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                                {profileData.company_logo
                                  ? "Change Logo"
                                  : "Upload Logo"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Company Name */}
                    <div>
                      <Label
                        htmlFor="company_name"
                        className="text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2 block"
                      >
                        Company Name
                      </Label>
                      <Input
                        id="company_name"
                        type="text"
                        value={profileData.company_name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            company_name: e.target.value,
                          })
                        }
                        placeholder="e.g., Tech Solutions Inc."
                        className="w-full h-8 md:h-10 text-xs md:text-sm"
                      />
                    </div>

                    {/* Description/Bio */}
                    <div>
                      <Label
                        htmlFor="description"
                        className="text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2 block"
                      >
                        Company Description
                      </Label>
                      <Textarea
                        id="description"
                        value={profileData.description}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Tell applicants about your company..."
                        rows={3}
                        className="w-full text-xs md:text-sm resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2 md:pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className="h-8 md:h-10 text-xs md:text-sm px-3 md:px-4"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account" className="space-y-3 md:space-y-6">
                <Card>
                  <CardHeader className="p-3 md:p-6">
                    <CardTitle className="text-base md:text-lg">
                      Change Password
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6">
                    <div>
                      <Label
                        htmlFor="newPassword"
                        className="text-xs md:text-sm"
                      >
                        New Password
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={accountSettings.newPassword}
                        onChange={(e) =>
                          setAccountSettings((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        placeholder="Enter new password"
                        className="h-8 md:h-10 text-xs md:text-sm mt-1 md:mt-2"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="confirmPassword"
                        className="text-xs md:text-sm"
                      >
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={accountSettings.confirmPassword}
                        onChange={(e) =>
                          setAccountSettings((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        placeholder="Confirm new password"
                        className="h-8 md:h-10 text-xs md:text-sm mt-1 md:mt-2"
                      />
                    </div>
                    <div className="flex justify-end pt-2 md:pt-4">
                      <Button
                        onClick={handleSaveAccount}
                        disabled={isLoading}
                        className="h-8 md:h-10 text-xs md:text-sm px-3 md:px-4"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
