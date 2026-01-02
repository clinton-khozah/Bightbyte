import * as React from "react";
import {
  X,
  Upload,
  FileText,
  Building2,
  MapPin,
  Phone,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface VerificationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  userId: string;
}

interface VerificationData {
  companyName: string;
  registrationNumber: string;
  address: string;
  phone: string;
  documents: {
    businessRegistration: { url: string; name: string; status: string } | null;
    idDocument: { url: string; name: string; status: string } | null;
    proofOfAddress: { url: string; name: string; status: string } | null;
  };
}

export function VerificationPopup({
  isOpen,
  onClose,
  onSubmit,
  userId,
}: VerificationPopupProps) {
  const [step, setStep] = React.useState(1);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [existingData, setExistingData] =
    React.useState<VerificationData | null>(null);
  const [formData, setFormData] = React.useState({
    companyName: "",
    registrationNumber: "",
    address: "",
    phone: "",
    documents: {
      businessRegistration: null as File | null,
      idDocument: null as File | null,
      proofOfAddress: null as File | null,
    },
  });

  // Fetch existing verification data when popup opens
  React.useEffect(() => {
    if (isOpen && userId) {
      fetchVerificationData();
    }
  }, [isOpen, userId]);

  const fetchVerificationData = async () => {
    try {
      setLoading(true);
      // Try to fetch from companies table first
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (companyData) {
        setExistingData({
          companyName: companyData.company_name || "",
          registrationNumber: companyData.name || "",
          address: companyData.address || "",
          phone: companyData.phone_number || "",
          documents: {
            businessRegistration: companyData.company_registration_document
              ? {
                  url: companyData.company_registration_document,
                  name: "Business Registration",
                  status: companyData.is_verified ? "approved" : "pending",
                }
              : null,
            idDocument: null, // Companies table doesn't have ID document field
            proofOfAddress: companyData.tax_certificate
              ? {
                  url: companyData.tax_certificate,
                  name: "Tax Certificate",
                  status: companyData.is_verified ? "approved" : "pending",
                }
              : null,
          },
        });
        // Pre-fill form with existing data
        setFormData({
          companyName: companyData.company_name || "",
          registrationNumber: companyData.name || "",
          address: companyData.address || "",
          phone: companyData.phone_number || "",
          documents: {
            businessRegistration: null,
            idDocument: null,
            proofOfAddress: null,
          },
        });
      } else {
        // Try mentors table
        const { data: mentorData } = await supabase
          .from("mentors")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (mentorData) {
          setExistingData({
            companyName: mentorData.company_name || mentorData.name || "",
            registrationNumber: mentorData.id_number || "",
            address: "",
            phone: mentorData.phone_number || "",
            documents: {
              businessRegistration: mentorData.cv_document
                ? {
                    url: mentorData.cv_document,
                    name: "CV Document",
                    status: mentorData.is_verified ? "approved" : "pending",
                  }
                : null,
              idDocument: null,
              proofOfAddress: null,
            },
          });
          setFormData({
            companyName: mentorData.company_name || mentorData.name || "",
            registrationNumber: mentorData.id_number || "",
            address: "",
            phone: mentorData.phone_number || "",
            documents: {
              businessRegistration: null,
              idDocument: null,
              proofOfAddress: null,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error fetching verification data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange =
    (documentType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setFormData((prev) => ({
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: e.target.files![0],
          },
        }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit(formData);
      setShowSuccess(true);
      // Refresh verification data after submission
      setTimeout(() => {
        fetchVerificationData();
      }, 1000);
    } catch (error) {
      console.error("Error submitting verification:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setStep(1);
    onClose();
  };

  return (
    <AnimatePresence>
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseSuccess}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Verification Submitted Successfully!
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Your verification documents have been submitted and are under
                review. You will be notified once the verification process is
                complete.
              </p>
              <button
                onClick={handleCloseSuccess}
                className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isOpen && !showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Popup Card - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white border border-gray-200 rounded-xl p-6 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Account Verification
              </h2>
              <p className="text-gray-600 text-sm">
                Complete the verification process to unlock all features
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  1
                </div>
                <div
                  className={`w-16 h-0.5 ${
                    step > 1 ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 2
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  2
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                /* Step 1: Business Information */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            companyName: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Number
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.registrationNumber}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            registrationNumber: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter registration number"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter business address"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter phone number"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Next Step
                  </button>
                </div>
              ) : (
                /* Step 2: Document Upload */
                <div className="space-y-4">
                  {/* Verification Documents Table */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Verification Documents
                    </h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                              Document Type
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3 text-gray-900">
                              Business Registration
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  existingData?.documents.businessRegistration
                                    ? existingData.documents
                                        .businessRegistration.status ===
                                      "approved"
                                      ? "bg-green-100 text-green-800"
                                      : existingData.documents
                                          .businessRegistration.status ===
                                        "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                    : formData.documents.businessRegistration
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {existingData?.documents.businessRegistration
                                  ? existingData.documents.businessRegistration
                                      .status === "approved"
                                    ? "Approved"
                                    : existingData.documents
                                        .businessRegistration.status ===
                                      "rejected"
                                    ? "Rejected"
                                    : "Pending Review"
                                  : formData.documents.businessRegistration
                                  ? "Uploaded"
                                  : "Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3 flex items-center gap-2">
                              {existingData?.documents.businessRegistration && (
                                <a
                                  href={
                                    existingData.documents.businessRegistration
                                      .url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-medium flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </a>
                              )}
                              <label
                                htmlFor="business-registration"
                                className="text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-medium"
                              >
                                {formData.documents.businessRegistration ||
                                existingData?.documents.businessRegistration
                                  ? "Change"
                                  : "Upload"}
                              </label>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-gray-900">
                              ID Document
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  existingData?.documents.idDocument
                                    ? existingData.documents.idDocument
                                        .status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : existingData.documents.idDocument
                                          .status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                    : formData.documents.idDocument
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {existingData?.documents.idDocument
                                  ? existingData.documents.idDocument.status ===
                                    "approved"
                                    ? "Approved"
                                    : existingData.documents.idDocument
                                        .status === "rejected"
                                    ? "Rejected"
                                    : "Pending Review"
                                  : formData.documents.idDocument
                                  ? "Uploaded"
                                  : "Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3 flex items-center gap-2">
                              {existingData?.documents.idDocument && (
                                <a
                                  href={existingData.documents.idDocument.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-medium flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </a>
                              )}
                              <label
                                htmlFor="id-document"
                                className="text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-medium"
                              >
                                {formData.documents.idDocument ||
                                existingData?.documents.idDocument
                                  ? "Change"
                                  : "Upload"}
                              </label>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-gray-900">
                              Proof of Address
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  existingData?.documents.proofOfAddress
                                    ? existingData.documents.proofOfAddress
                                        .status === "approved"
                                      ? "bg-green-100 text-green-800"
                                      : existingData.documents.proofOfAddress
                                          .status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                    : formData.documents.proofOfAddress
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {existingData?.documents.proofOfAddress
                                  ? existingData.documents.proofOfAddress
                                      .status === "approved"
                                    ? "Approved"
                                    : existingData.documents.proofOfAddress
                                        .status === "rejected"
                                    ? "Rejected"
                                    : "Pending Review"
                                  : formData.documents.proofOfAddress
                                  ? "Uploaded"
                                  : "Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3 flex items-center gap-2">
                              {existingData?.documents.proofOfAddress && (
                                <a
                                  href={
                                    existingData.documents.proofOfAddress.url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-medium flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </a>
                              )}
                              <label
                                htmlFor="proof-of-address"
                                className="text-blue-600 hover:text-blue-700 cursor-pointer text-xs font-medium"
                              >
                                {formData.documents.proofOfAddress ||
                                existingData?.documents.proofOfAddress
                                  ? "Change"
                                  : "Upload"}
                              </label>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Registration Document
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileChange("businessRegistration")}
                        className="hidden"
                        id="business-registration"
                        accept=".pdf,.doc,.docx"
                        required={!existingData?.documents.businessRegistration}
                      />
                      <label
                        htmlFor="business-registration"
                        className={`flex items-center justify-center w-full border border-dashed rounded-lg p-4 cursor-pointer transition-colors group ${
                          existingData?.documents.businessRegistration ||
                          formData.documents.businessRegistration
                            ? "bg-blue-50 border-blue-300 hover:border-blue-500 hover:bg-blue-100"
                            : "bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                        }`}
                      >
                        <div className="text-center">
                          <Upload className="h-6 w-6 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
                          <span className="text-sm text-gray-600 group-hover:text-blue-600">
                            {formData.documents.businessRegistration
                              ? formData.documents.businessRegistration.name
                              : existingData?.documents.businessRegistration
                              ? `${existingData.documents.businessRegistration.name} (Click to change)`
                              : "Upload business registration"}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID Document
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileChange("idDocument")}
                        className="hidden"
                        id="id-document"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required={!existingData?.documents.idDocument}
                      />
                      <label
                        htmlFor="id-document"
                        className={`flex items-center justify-center w-full border border-dashed rounded-lg p-4 cursor-pointer transition-colors group ${
                          existingData?.documents.idDocument ||
                          formData.documents.idDocument
                            ? "bg-blue-50 border-blue-300 hover:border-blue-500 hover:bg-blue-100"
                            : "bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                        }`}
                      >
                        <div className="text-center">
                          <Upload className="h-6 w-6 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
                          <span className="text-sm text-gray-600 group-hover:text-blue-600">
                            {formData.documents.idDocument
                              ? formData.documents.idDocument.name
                              : existingData?.documents.idDocument
                              ? `${existingData.documents.idDocument.name} (Click to change)`
                              : "Upload ID document"}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proof of Address
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        onChange={handleFileChange("proofOfAddress")}
                        className="hidden"
                        id="proof-of-address"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required={!existingData?.documents.proofOfAddress}
                      />
                      <label
                        htmlFor="proof-of-address"
                        className={`flex items-center justify-center w-full border border-dashed rounded-lg p-4 cursor-pointer transition-colors group ${
                          existingData?.documents.proofOfAddress ||
                          formData.documents.proofOfAddress
                            ? "bg-blue-50 border-blue-300 hover:border-blue-500 hover:bg-blue-100"
                            : "bg-gray-50 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
                        }`}
                      >
                        <div className="text-center">
                          <Upload className="h-6 w-6 text-gray-400 group-hover:text-blue-600 mx-auto mb-2" />
                          <span className="text-sm text-gray-600 group-hover:text-blue-600">
                            {formData.documents.proofOfAddress
                              ? formData.documents.proofOfAddress.name
                              : existingData?.documents.proofOfAddress
                              ? `${existingData.documents.proofOfAddress.name} (Click to change)`
                              : "Upload proof of address"}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Submitting..." : "Submit Verification"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
