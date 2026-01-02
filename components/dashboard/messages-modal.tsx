"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  X,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  Download,
  Check,
  CheckCheck,
  Sparkles,
  Zap,
  User,
  Shield,
  Reply,
  Mail,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  user_id: string;
  user_type: string;
  subject: string | null;
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  status: "pending" | "read" | "resolved" | "closed";
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  is_from_user: boolean;
}

interface UserConversation {
  user_id: string;
  user_email: string;
  user_name: string;
  user_type: string;
  avatar_url: string | null;
  last_message_at: string;
  unread_count: number;
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: string;
  userId: string;
  userData?: {
    full_name?: string;
    avatar_url?: string | null;
    email?: string;
  };
}

export function MessagesModal({
  isOpen,
  onClose,
  userType,
  userId,
  userData,
}: MessagesModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [selectedConversationUserId, setSelectedConversationUserId] = useState<
    string | null
  >(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(
    null
  );

  // Normalize user type to match database constraint
  const normalizedUserType =
    userType === "tutor"
      ? "mentor"
      : userType === "student"
      ? "student"
      : "mentor";

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email === "clintonkhozah@gmail.com") {
          setIsAdmin(true);
          setAdminEmail(user.email);
        } else {
          setIsAdmin(false);
          setAdminEmail(user?.email || null);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };
    if (isOpen) {
      checkAdmin();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (isAdmin) {
        fetchConversations();
      } else if (userId) {
        fetchUserAvatar();
        fetchMessages();
      }
    }
  }, [isOpen, userId, isAdmin]);

  useEffect(() => {
    if (isOpen && isAdmin && selectedConversationUserId) {
      fetchMessagesForUser(selectedConversationUserId);
    }
  }, [isOpen, isAdmin, selectedConversationUserId]);

  const fetchUserAvatar = async () => {
    if (!userId) return;

    try {
      // Try students table first
      const { data: studentData } = await supabase
        .from("students")
        .select("avatar_url")
        .eq("id", userId)
        .single();

      if (studentData?.avatar_url) {
        setUserAvatar(studentData.avatar_url);
      } else {
        // Try mentors table
        const { data: mentorData } = await supabase
          .from("mentors")
          .select("avatar_url")
          .eq("id", userId)
          .single();

        if (mentorData?.avatar_url) {
          setUserAvatar(mentorData.avatar_url);
        }
      }
    } catch (error) {
      console.error("Error fetching user avatar:", error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Fetch all messages grouped by user
      const { data: allMessages, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by user_id and get user info
      const userMap = new Map<string, UserConversation>();

      for (const msg of allMessages || []) {
        if (!userMap.has(msg.user_id)) {
          // Fetch user info
          let userInfo: {
            name?: string;
            email?: string;
            avatar_url?: string | null;
          } = {};

          // Try to get email from auth.users first (using RPC or direct query)
          let userEmail: string | null = null;
          try {
            // Try to get user email from auth.users via a helper query
            // Note: We can't directly query auth.users, so we'll try tables first
          } catch (e) {
            // Ignore errors
          }

          // Try students table - students.id is UUID that matches auth.users.id
          const { data: studentData } = await supabase
            .from("students")
            .select("full_name, email, avatar_url")
            .eq("id", msg.user_id)
            .maybeSingle();

          if (studentData) {
            userInfo = {
              name: studentData.full_name || "User",
              email: studentData.email || userEmail || "No email",
              avatar_url: studentData.avatar_url,
            };
          } else {
            // Try mentors table - mentors.user_id is UUID that matches auth.users.id
            const { data: mentorData } = await supabase
              .from("mentors")
              .select("name, email, avatar_url")
              .eq("user_id", msg.user_id)
              .maybeSingle();

            if (mentorData) {
              userInfo = {
                name: mentorData.name || "User",
                email: mentorData.email || userEmail || "No email",
                avatar_url: mentorData.avatar_url,
              };
            } else {
              // Try mentors table with id field (fallback)
              const { data: mentorById } = await supabase
                .from("mentors")
                .select("name, email, avatar_url")
                .eq("id", msg.user_id)
                .maybeSingle();

              if (mentorById) {
                userInfo = {
                  name: mentorById.name || "User",
                  email: mentorById.email || userEmail || "No email",
                  avatar_url: mentorById.avatar_url,
                };
              } else {
                // Final fallback - try to extract email from message metadata or use placeholder
                // Extract email from user_id if possible (last resort)
                userInfo = {
                  name: "User",
                  email: userEmail || `user_${msg.user_id.substring(0, 8)}`,
                  avatar_url: null,
                };
              }
            }
          }

          // Get unread count (messages without admin_response)
          const unreadCount = (allMessages || []).filter(
            (m) =>
              m.user_id === msg.user_id &&
              !m.admin_response &&
              m.status === "pending"
          ).length;

          userMap.set(msg.user_id, {
            user_id: msg.user_id,
            user_email: userInfo.email || "Unknown",
            user_name: userInfo.name || "Unknown User",
            user_type: msg.user_type,
            avatar_url: userInfo.avatar_url || null,
            last_message_at: msg.created_at,
            unread_count: unreadCount,
          });
        } else {
          // Update last message time if this is newer
          const existing = userMap.get(msg.user_id)!;
          if (new Date(msg.created_at) > new Date(existing.last_message_at)) {
            existing.last_message_at = msg.created_at;
          }
        }
      }

      const conversationsList = Array.from(userMap.values()).sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
      );

      setConversations(conversationsList);

      // Auto-select first conversation if none selected
      if (conversationsList.length > 0 && !selectedConversationUserId) {
        setSelectedConversationUserId(conversationsList[0].user_id);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesForUser = async (targetUserId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform messages to chat format
      const chatMessages: ChatMessage[] = (data || []).flatMap((msg) => {
        const userMessage: ChatMessage = {
          ...msg,
          is_from_user: !isAdmin, // If admin viewing, user messages are from the other person
        };
        const messages: ChatMessage[] = [userMessage];

        // If there's an admin response, add it as a separate message
        if (msg.admin_response) {
          messages.push({
            id: `${msg.id}_admin`,
            user_id: "admin",
            user_type: "admin",
            subject: null,
            message: msg.admin_response,
            attachment_url: null,
            attachment_name: null,
            attachment_type: null,
            status: msg.status,
            admin_response: null,
            created_at: msg.updated_at,
            updated_at: msg.updated_at,
            expires_at: msg.expires_at,
            is_from_user: isAdmin, // If admin viewing, admin responses are from admin
          });
        }
        return messages;
      });

      setMessages(chatMessages);

      // Fetch user avatar for the selected conversation
      const conversation = conversations.find(
        (c) => c.user_id === targetUserId
      );
      if (conversation) {
        setUserAvatar(conversation.avatar_url);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform messages to chat format
      const chatMessages: ChatMessage[] = (data || []).flatMap((msg) => {
        const userMessage: ChatMessage = {
          ...msg,
          is_from_user: true,
        };
        const messages: ChatMessage[] = [userMessage];

        // If there's an admin response, add it as a separate message
        if (msg.admin_response) {
          messages.push({
            id: `${msg.id}_admin`,
            user_id: "admin",
            user_type: "admin",
            subject: null,
            message: msg.admin_response,
            attachment_url: null,
            attachment_name: null,
            attachment_type: null,
            status: msg.status,
            admin_response: null,
            created_at: msg.updated_at,
            updated_at: msg.updated_at,
            expires_at: msg.expires_at,
            is_from_user: false,
          });
        }
        return messages;
      });

      setMessages(chatMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploadingFile(true);
    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `${sanitizedUserId}_${timestamp}.${fileExtension}`;
      const filePath = `messages/${sanitizedUserId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("course-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          status: "read",
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) {
        console.error("Error marking message as read:", error);
      } else {
        // Refresh messages
        if (isAdmin && selectedConversationUserId) {
          await fetchMessagesForUser(selectedConversationUserId);
          await fetchConversations(); // Refresh conversation list to update unread counts
        } else {
          await fetchMessages();
        }
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const handleAdminReply = async (messageId: string, replyText: string) => {
    if (!replyText.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          admin_response: replyText.trim(),
          status: "read",
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) {
        console.error("Error replying to message:", error);
        throw error;
      }

      // Refresh messages
      if (selectedConversationUserId) {
        await fetchMessagesForUser(selectedConversationUserId);
        await fetchConversations(); // Refresh conversation list
      }

      setReplyingToMessageId(null);
      setMessageText("");
    } catch (error) {
      console.error("Error replying to message:", error);
      alert("Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!messageText.trim() && !selectedFile) {
      return;
    }

    // If admin is replying to a specific message
    if (isAdmin && replyingToMessageId) {
      await handleAdminReply(replyingToMessageId, messageText);
      return;
    }

    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let attachmentType: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
        if (attachmentUrl) {
          attachmentName = selectedFile.name;
          attachmentType = selectedFile.type;
        }
      }

      // Create a subject from the first line of message or default
      const subject =
        messageText.trim().split("\n")[0].substring(0, 100) ||
        (selectedFile ? `File: ${selectedFile.name}` : "New Message");

      // Determine target user ID
      const targetUserId =
        isAdmin && selectedConversationUserId
          ? selectedConversationUserId
          : userId;

      // Insert message into database
      const { data, error } = await supabase
        .from("messages")
        .insert({
          user_id: targetUserId,
          user_type: normalizedUserType,
          subject: subject,
          message:
            messageText.trim() ||
            (selectedFile ? `Sent file: ${selectedFile.name}` : ""),
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_type: attachmentType,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      // Add message to local state immediately for better UX
      const newMessage: ChatMessage = {
        ...data,
        is_from_user: !isAdmin,
      };
      setMessages((prev) => [...prev, newMessage]);

      // Reset form
      setMessageText("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh conversations if admin
      if (isAdmin) {
        await fetchConversations();
      } else {
        // Auto-response: Create an admin response message (only for non-admin users)
        setTimeout(async () => {
          try {
            const autoResponseMessage =
              "Thank you for contacting us! A consultant will contact you or respond to you soon. We appreciate your patience.";

            // Update the message with admin response
            const { error: updateError } = await supabase
              .from("messages")
              .update({
                admin_response: autoResponseMessage,
                status: "read",
                updated_at: new Date().toISOString(),
              })
              .eq("id", data.id);

            if (updateError) {
              console.error("Error adding auto-response:", updateError);
            } else {
              // Refresh messages to show the auto-response
              await fetchMessages();
            }
          } catch (error) {
            console.error("Error in auto-response:", error);
          }
        }, 1000); // Wait 1 second before showing auto-response
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateHeader = (dateString: string, prevDateString?: string) => {
    const date = new Date(dateString);
    const prevDate = prevDateString ? new Date(prevDateString) : null;

    if (prevDate && date.toDateString() === prevDate.toDateString()) {
      return null;
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`relative bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl shadow-2xl ${
                isAdmin ? "max-w-6xl" : "max-w-2xl"
              } w-full h-[85vh] flex flex-col overflow-hidden border border-purple-200`}
            >
              {/* Animated Background Effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-100 rounded-full blur-3xl animate-pulse opacity-50" />
                <div
                  className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl animate-pulse opacity-50"
                  style={{ animationDelay: "1s" }}
                />
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-100 rounded-full blur-2xl animate-pulse opacity-40"
                  style={{ animationDelay: "2s" }}
                />
              </div>

              {/* Admin Sidebar */}
              {isAdmin && (
                <div className="relative w-64 md:w-80 border-r border-purple-200 bg-white flex flex-col">
                  <div className="p-3 md:p-4 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
                      <h3 className="text-base md:text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Conversations
                      </h3>
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-600">
                      Select a user to view messages
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 md:p-4">
                    {conversations.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No conversations yet</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 md:gap-4">
                        {conversations.map((conv) => (
                          <button
                            key={conv.user_id}
                            onClick={() =>
                              setSelectedConversationUserId(conv.user_id)
                            }
                            className={`relative flex flex-col items-center p-3 md:p-4 rounded-xl hover:bg-purple-50 transition-all ${
                              selectedConversationUserId === conv.user_id
                                ? "bg-purple-100 ring-2 ring-purple-500 shadow-md"
                                : "bg-white border border-gray-200 hover:border-purple-300"
                            }`}
                          >
                            {/* Unread Badge */}
                            {conv.unread_count > 0 && (
                              <span className="absolute -top-1 -right-1 px-1.5 md:px-2 py-0.5 bg-red-500 text-white text-[10px] md:text-xs rounded-full font-medium min-w-[18px] text-center z-10 shadow-lg">
                                {conv.unread_count > 9
                                  ? "9+"
                                  : conv.unread_count}
                              </span>
                            )}

                            {/* Avatar */}
                            <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white flex-shrink-0 shadow-lg mb-2 md:mb-3 overflow-hidden border-2 border-white">
                              {conv.avatar_url ? (
                                <img
                                  src={conv.avatar_url}
                                  alt={conv.user_name}
                                  className="w-full h-full rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                    const fallback = target.nextElementSibling;
                                    if (fallback) {
                                      (fallback as HTMLElement).style.display =
                                        "flex";
                                    }
                                  }}
                                />
                              ) : null}
                              <div
                                className={`w-full h-full rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center ${
                                  conv.avatar_url ? "hidden" : ""
                                }`}
                              >
                                <User className="w-7 h-7 md:w-8 md:h-8" />
                              </div>
                            </div>

                            {/* User Info */}
                            <div className="text-center min-w-0 w-full">
                              <p className="text-xs md:text-sm font-semibold text-gray-900 truncate mb-0.5">
                                {conv.user_name}
                              </p>
                              <p className="text-[10px] md:text-xs text-gray-500 truncate mb-1">
                                {conv.user_email}
                              </p>
                              <p className="text-[9px] md:text-[10px] text-gray-400">
                                {formatTime(conv.last_message_at)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="relative flex items-center justify-between p-3 md:p-4 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                      className="relative w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-purple-200 overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src="/images/logo1.png"
                        alt="Logo"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base md:text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent truncate">
                          {isAdmin && selectedConversationUserId
                            ? conversations.find(
                                (c) => c.user_id === selectedConversationUserId
                              )?.user_name || "Support Assistant"
                            : "Support Assistant"}
                        </h2>
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 flex-shrink-0" />
                        </motion.div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                        <p className="text-[10px] md:text-xs text-gray-600 truncate">
                          {isAdmin && selectedConversationUserId
                            ? conversations.find(
                                (c) => c.user_id === selectedConversationUserId
                              )?.user_email || "user"
                            : "Online • A consultant will respond soon"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 md:p-2 hover:bg-purple-100 rounded-full flex-shrink-0"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>

                {/* Messages Area */}
                <div className="relative flex-1 overflow-y-auto p-4 bg-gradient-to-b from-white to-blue-50">
                  {isAdmin && !selectedConversationUserId ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                        }}
                        className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-6 border border-purple-200 shadow-lg"
                      >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-300 to-blue-300 animate-ping opacity-20" />
                        <Users className="w-12 h-12 text-purple-600 relative z-10" />
                      </motion.div>
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2"
                      >
                        Select a Conversation
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm text-gray-600 max-w-sm"
                      >
                        Choose a user from the sidebar to view and reply to
                        their messages.
                      </motion.p>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center h-full">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Loader2 className="w-8 h-8 text-purple-500" />
                      </motion.div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                        }}
                        className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-6 border border-purple-200 shadow-lg"
                      >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-300 to-blue-300 animate-ping opacity-20" />
                        <MessageSquare className="w-12 h-12 text-purple-600 relative z-10" />
                      </motion.div>
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2"
                      >
                        Start a Conversation
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm text-gray-600 max-w-sm"
                      >
                        Connect with our AI support team. We're here to help
                        with payment issues, session problems, and more.
                      </motion.p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, index) => {
                        const dateHeader = formatDateHeader(
                          msg.created_at,
                          index > 0 ? messages[index - 1].created_at : undefined
                        );

                        return (
                          <React.Fragment key={msg.id}>
                            {dateHeader && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex justify-center my-4"
                              >
                                <span className="px-4 py-1.5 bg-purple-100 rounded-full text-xs text-purple-700 border border-purple-200 shadow-md">
                                  {dateHeader}
                                </span>
                              </motion.div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className={`flex items-end gap-2 ${
                                msg.is_from_user
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              {/* Profile Icon */}
                              {msg.is_from_user ? (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white flex-shrink-0 shadow-lg border-2 border-white">
                                  {userAvatar ? (
                                    <img
                                      src={userAvatar}
                                      alt="User"
                                      className="w-full h-full rounded-full object-cover"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        target.nextElementSibling?.classList.remove(
                                          "hidden"
                                        );
                                      }}
                                    />
                                  ) : null}
                                  {!userAvatar && <User className="w-5 h-5" />}
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-purple-200 overflow-hidden">
                                  <Image
                                    src="/images/logo1.png"
                                    alt="Logo"
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-contain p-1"
                                    onError={(e) => {
                                      const target =
                                        e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      const fallback =
                                        target.nextElementSibling;
                                      if (fallback) {
                                        (
                                          fallback as HTMLElement
                                        ).style.display = "flex";
                                      }
                                    }}
                                  />
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-white hidden">
                                    <Shield className="w-5 h-5 text-white" />
                                  </div>
                                </div>
                              )}

                              <div
                                className={`relative max-w-[70%] rounded-2xl px-5 py-3.5 ${
                                  msg.is_from_user
                                    ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-sm shadow-lg shadow-purple-500/20"
                                    : "bg-white text-gray-800 rounded-bl-sm shadow-md border border-purple-100"
                                }`}
                              >
                                {/* Glow effect for user messages */}
                                {msg.is_from_user && (
                                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 opacity-20 blur-xl -z-10" />
                                )}

                                {/* Subject for user messages - only show if different from message */}
                                {msg.subject &&
                                  msg.is_from_user &&
                                  msg.subject.trim().toLowerCase() !==
                                    msg.message.trim().toLowerCase() && (
                                    <div className="mb-2 pb-2 border-b border-white/20">
                                      <p className="text-xs font-semibold text-white/90 uppercase tracking-wide">
                                        {msg.subject}
                                      </p>
                                    </div>
                                  )}

                                {/* Attachment */}
                                {msg.attachment_url && (
                                  <div
                                    className={`mb-3 ${
                                      msg.is_from_user
                                        ? "text-white"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {msg.attachment_type?.startsWith(
                                      "image/"
                                    ) ? (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative rounded-lg overflow-hidden border border-white/20"
                                      >
                                        <img
                                          src={msg.attachment_url}
                                          alt={
                                            msg.attachment_name || "Attachment"
                                          }
                                          className="max-w-full max-h-64 object-contain"
                                        />
                                      </motion.div>
                                    ) : (
                                      <motion.a
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        href={msg.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                                          msg.is_from_user
                                            ? "bg-white/10 hover:bg-white/20 border border-white/20"
                                            : "bg-purple-50 hover:bg-purple-100 border border-purple-200"
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm truncate flex-1">
                                          {msg.attachment_name}
                                        </span>
                                        <Download className="w-4 h-4 flex-shrink-0" />
                                      </motion.a>
                                    )}
                                  </div>
                                )}

                                {/* Message Text */}
                                {msg.message && (
                                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                    {msg.message}
                                  </p>
                                )}

                                {/* Timestamp and Status */}
                                <div
                                  className={`flex items-center justify-between mt-3 pt-2 border-t ${
                                    msg.is_from_user
                                      ? "text-white/70 border-white/10"
                                      : "text-gray-400 border-gray-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Zap className="w-3 h-3" />
                                    <span className="text-xs">
                                      {formatTime(msg.created_at)}
                                    </span>
                                    {msg.is_from_user && (
                                      <span className="ml-1">
                                        {msg.status === "read" ||
                                        msg.status === "resolved" ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  {/* Admin Actions */}
                                  {isAdmin &&
                                    !msg.is_from_user &&
                                    !msg.admin_response && (
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setReplyingToMessageId(
                                              msg.id.replace("_admin", "")
                                            );
                                            setMessageText("");
                                          }}
                                          className="text-xs px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors flex items-center gap-1"
                                        >
                                          <Reply className="w-3 h-3" />
                                          Reply
                                        </button>
                                        {msg.status === "pending" && (
                                          <button
                                            onClick={() =>
                                              handleMarkAsRead(
                                                msg.id.replace("_admin", "")
                                              )
                                            }
                                            className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                                          >
                                            Mark Read
                                          </button>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </motion.div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input Area */}
                {(!isAdmin || selectedConversationUserId) && (
                  <form
                    onSubmit={handleSendMessage}
                    className="relative border-t border-purple-200 bg-gradient-to-r from-white to-blue-50 p-4"
                  >
                    {/* Reply Indicator */}
                    {replyingToMessageId && (
                      <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Reply className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-700">
                            Replying to message
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToMessageId(null);
                            setMessageText("");
                          }}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {/* Selected File Preview */}
                    <AnimatePresence>
                      {selectedFile && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="mb-3 flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200 shadow-sm"
                        >
                          {selectedFile.type.startsWith("image/") ? (
                            <ImageIcon className="w-5 h-5 text-purple-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-purple-600" />
                          )}
                          <span className="text-sm text-gray-700 flex-1 truncate">
                            {selectedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                            className="text-red-500 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-end gap-3">
                      {/* File Input */}
                      <motion.label
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 text-purple-600 hover:text-purple-700 hover:bg-purple-100 rounded-full cursor-pointer transition-all border border-purple-200 shadow-sm bg-white"
                      >
                        <Paperclip className="w-5 h-5" />
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                        />
                      </motion.label>

                      {/* Message Input */}
                      <div className="flex-1 relative">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Type your message..."
                          rows={1}
                          className="w-full px-5 py-3 pr-14 bg-white border border-purple-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none max-h-32 overflow-y-auto text-gray-800 placeholder-gray-400 transition-all shadow-sm"
                          style={{ minHeight: "52px" }}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Zap className="w-4 h-4 text-purple-400/60" />
                        </div>
                      </div>

                      {/* Send Button */}
                      <motion.button
                        type="submit"
                        disabled={
                          sending ||
                          uploadingFile ||
                          (!messageText.trim() && !selectedFile)
                        }
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative p-3 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[52px] shadow-lg shadow-purple-500/20 disabled:shadow-none"
                      >
                        {sending || uploadingFile ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-5 h-5 relative z-10" />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 animate-ping opacity-20" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
