"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string | number;
  onSuccess?: () => void;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  mentorId,
  onSuccess,
}: CreateSessionModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const [formData, setFormData] = React.useState({
    topic: "",
    date: "",
    time: "",
    duration: "60",
    meeting_type: "google-meet",
    amount: "",
    notes: "",
  });
  const [paymentLink, setPaymentLink] = React.useState<string>("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.topic.trim()) {
      setError("Topic is required");
      return;
    }
    if (!formData.date) {
      setError("Date is required");
      return;
    }
    if (!formData.time) {
      setError("Time is required");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/mentors/create-session/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mentor_id: mentorId,
            topic: formData.topic.trim(),
            date: formData.date,
            time: formData.time,
            duration: parseInt(formData.duration),
            meeting_type: formData.meeting_type,
            amount: parseFloat(formData.amount),
            notes: formData.notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create session");
      }

      setSuccess(true);

      // Store payment link if provided
      if (data.payment_link) {
        setPaymentLink(data.payment_link);
      }

      // Reset form
      setFormData({
        topic: "",
        date: "",
        time: "",
        duration: "60",
        meeting_type: "google-meet",
        amount: "",
        notes: "",
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error("Error creating session:", error);
      setError(error.message || "Failed to create session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Create Session
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-12 px-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </motion.div>
                <p className="text-gray-700 text-lg mb-2 font-semibold">
                  Session Created Successfully!
                </p>
                <p className="text-gray-600 text-sm">
                  The session has been created and added to your schedule.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Session Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Session Details
                  </h3>

                  <div>
                    <Label
                      htmlFor="topic"
                      className="text-base font-semibold text-gray-900 mb-2 block"
                    >
                      Topic <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="topic"
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      placeholder="e.g., Python Programming Basics"
                      className="w-full"
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="date"
                        className="text-base font-semibold text-gray-900 mb-2 block"
                      >
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        min={today}
                        className="w-full"
                        disabled={isSubmitting}
                        required
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="time"
                        className="text-base font-semibold text-gray-900 mb-2 block"
                      >
                        <Clock className="inline h-4 w-4 mr-1" />
                        Time <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="time"
                        name="time"
                        type="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="w-full"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="duration"
                        className="text-base font-semibold text-gray-900 mb-2 block"
                      >
                        Duration (minutes){" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) =>
                          handleSelectChange("duration", value)
                        }
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                          <SelectItem value="120">120 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label
                        htmlFor="amount"
                        className="text-base font-semibold text-gray-900 mb-2 block"
                      >
                        <DollarSign className="inline h-4 w-4 mr-1" />
                        Amount (R) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Meeting Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    <Video className="inline h-5 w-5 mr-2" />
                    Meeting Details
                  </h3>

                  <div>
                    <Label
                      htmlFor="meeting_type"
                      className="text-base font-semibold text-gray-900 mb-2 block"
                    >
                      Meeting Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.meeting_type}
                      onValueChange={(value) =>
                        handleSelectChange("meeting_type", value)
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google-meet">Google Meet</SelectItem>
                        <SelectItem value="teams">Microsoft Teams</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="in-person">In-Person</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      A meeting link will be generated automatically. A payment
                      link will be created for students.
                    </p>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <Label
                    htmlFor="notes"
                    className="text-base font-semibold text-gray-900 mb-2 block"
                  >
                    <FileText className="inline h-4 w-4 mr-1" />
                    Additional Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional information about the session..."
                    className="min-h-[100px] resize-none"
                    disabled={isSubmitting}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Session"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
