"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  Filter,
  Trash2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LoadingLogo } from "@/components/loading-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  country?: string;
  city?: string;
  user_type: "mentor" | "student";
  status: string;
  verified: boolean;
  created_at: string;
  avatar_url?: string;
  // Mentor specific
  title?: string;
  hourly_rate?: number;
  // Student specific
  preferred_job_types?: string[];
  preferred_categories?: string[];
}

export default function UsersPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "mentor" | "student">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Check if user is authorized
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        const email = user.email?.trim().toLowerCase();
        if (email !== "clintonkhozah@gmail.com") {
          toast.error("Unauthorized access");
          router.push("/dashboard");
          return;
        }

        setUserData(user);
      } catch (error) {
        console.error("Error checking auth:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!userData) return;

      try {
        // Fetch mentors
        const { data: mentorsData, error: mentorsError } = await supabase
          .from("mentors")
          .select("*")
          .order("created_at", { ascending: false });

        if (mentorsError) {
          console.error("Error fetching mentors:", mentorsError);
        }

        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .order("created_at", { ascending: false });

        if (studentsError) {
          console.error("Error fetching students:", studentsError);
        }

        // Combine and format users
        const mentors: User[] = (mentorsData || []).map((mentor: any) => ({
          id: mentor.id?.toString() || mentor.user_id || "",
          email: mentor.email || "",
          full_name: mentor.name || mentor.full_name || "N/A",
          phone_number: mentor.phone_number || null,
          country: mentor.country || null,
          city: mentor.city || null,
          user_type: "mentor",
          status: mentor.status || "active",
          verified: mentor.is_verified || mentor.verified || false,
          created_at: mentor.created_at || new Date().toISOString(),
          avatar_url: mentor.avatar || mentor.avatar_url || null,
          title: mentor.title || null,
          hourly_rate: mentor.hourly_rate || null,
        }));

        const students: User[] = (studentsData || []).map((student: any) => ({
          id: student.id || "",
          email: student.email || "",
          full_name: student.full_name || "N/A",
          phone_number: student.phone_number || null,
          country: student.country || null,
          city: student.city || null,
          user_type: "student",
          status: student.status || "active",
          verified: student.verified || false,
          created_at: student.created_at || new Date().toISOString(),
          avatar_url: student.avatar_url || null,
          preferred_job_types: student.preferred_job_types || [],
          preferred_categories: student.preferred_categories || [],
        }));

        const allUsers = [...mentors, ...students];
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, [userData]);

  // Filter users
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.full_name.toLowerCase().includes(query) ||
          user.phone_number?.toLowerCase().includes(query) ||
          user.country?.toLowerCase().includes(query) ||
          user.city?.toLowerCase().includes(query)
      );
    }

    // User type filter
    if (userTypeFilter !== "all") {
      filtered = filtered.filter((user) => user.user_type === userTypeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, userTypeFilter, statusFilter]);

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);

      // Delete from the appropriate table
      if (userToDelete.user_type === "mentor") {
        const { error } = await supabase
          .from("mentors")
          .delete()
          .eq("id", parseInt(userToDelete.id) || userToDelete.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("students")
          .delete()
          .eq("id", userToDelete.id);

        if (error) throw error;
      }

      // Remove from local state
      setUsers(users.filter((u) => u.id !== userToDelete.id));
      setFilteredUsers(filteredUsers.filter((u) => u.id !== userToDelete.id));

      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user: " + (error.message || "Unknown error"));
    } finally {
      setDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Email",
      "Full Name",
      "Phone",
      "Country",
      "City",
      "Status",
      "Verified",
      "Created At",
    ];
    const rows = filteredUsers.map((user) => [
      user.id,
      user.email,
      user.full_name,
      user.phone_number || "",
      user.country || "",
      user.city || "",
      user.status,
      user.verified ? "Yes" : "No",
      new Date(user.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Users exported to CSV");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingLogo size={48} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                All Users
              </h1>
            </div>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          <p className="text-sm md:text-base text-gray-600">
            View and manage all platform users
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={userTypeFilter} onValueChange={(value: any) => setUserTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="mentor">Mentors</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Users ({filteredUsers.length} of {users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profile</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-semibold">
                              {user.full_name
                                ? user.full_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.full_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.phone_number ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {user.phone_number}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.city || user.country ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              {[user.city, user.country].filter(Boolean).join(", ")}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.status === "active" ? "default" : "outline"}
                            className="capitalize"
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.verified ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(user)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{userToDelete?.full_name}</strong> (
                {userToDelete?.email})? This action cannot be undone and will
                permanently remove their profile from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

