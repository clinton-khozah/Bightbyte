import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import { useOpsList } from "../../hooks/useOpsList";
import StatusChip from "../../components/StatusChip/StatusChip";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import Avatar from "../../components/Avatar/Avatar";
import ReviewFormModal from "../../components/ReviewFormModal/ReviewFormModal";
import ReviewStatusForm from "../../components/ReviewStatusForm/ReviewStatusForm";
import Modal from "../../components/Modal/Modal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import "./ReviewsPage.css";

const ANGLES = [
  { key: "front", label: "Front" },
  { key: "rear", label: "Rear" },
  { key: "left", label: "Left side" },
  { key: "right", label: "Right side" },
];

const ReviewsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [people, setPeople] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [vehicleStatus, setVehicleStatus] = useState("available");
  const [reviewStatus, setReviewStatus] = useState("submitted");
  const [statusError, setStatusError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const canManage = can(user, "reviews", "edit");
  const canCreate = can(user, "reviews", "create");
  const canDelete = can(user, "reviews", "delete");
  const [reviewerNote, setReviewerNote] = useState("");
  const [form, setForm] = useState({
    driver_id: "",
    vehicle_id: "",
    condition: "good",
    notes: "",
    review_month: new Date().toISOString().slice(0, 10),
    photos: { front: "", rear: "", left: "", right: "" },
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api("/api/reviews"),
      api("/api/vehicles"),
      api("/api/users").catch(() => api("/api/drivers")),
    ])
      .then(([reviews, list, users = []]) => {
        setRows(user?.role === "driver" ? reviews.filter((row) => row.driver_id === user.id) : reviews);
        setVehicles(list);
        setPeople(user?.role === "driver" ? users.filter((row) => row.id === user.id) : users);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [user?.role, user?.id]);

  const onPhoto = (key, url) => {
    setForm((f) => ({ ...f, photos: { ...f.photos, [key]: url } }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (ANGLES.some((angle) => !form.photos[angle.key])) {
      setError("Take all four live photos before submitting.");
      return;
    }
    if (user?.role !== "driver" && !form.driver_id) {
      setError("Select a driver");
      return;
    }
    if (!form.vehicle_id) {
      setError("Select a vehicle");
      return;
    }
    try {
      await api("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          photos: ANGLES.map((a) => form.photos[a.key]).filter(Boolean),
        }),
      });
      setOpen(false);
      setSuccess("Review was submitted.");
      setForm({
        driver_id: user?.role === "driver" ? user.id : "",
        vehicle_id: "",
        condition: "good",
        notes: "",
        review_month: new Date().toISOString().slice(0, 10),
        photos: { front: "", rear: "", left: "", right: "" },
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const vehicleFor = (id) => vehicles.find((v) => v.id === id);
  const personFor = (id) => people.find((p) => p.id === id);

  const openStatus = (row) => {
    const vehicle = vehicleFor(row.vehicle_id);
    setEditing(row);
    setVehicleStatus(vehicle?.status || "available");
    setReviewStatus(row.status || "submitted");
    setReviewerNote(row.reviewer_note || "");
    setStatusError("");
  };

  const saveStatus = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setStatusError("");
    try {
      await Promise.all([
        api(`/api/reviews/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: reviewStatus, reviewer_note: reviewerNote }),
        }),
        api(`/api/vehicles/${editing.vehicle_id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: vehicleStatus }),
        }),
      ]);
      setEditing(null);
      setSuccess("Vehicle and review status were saved.");
      load();
    } catch (err) {
      setStatusError(err.message);
    }
  };

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "condition",
    searchKeys: ["notes", "condition", "vehicle_id"],
  });

  return (
    <div className="reviews-page">
      <OpsPage
        crumb={["Operations", "Car reviews"]}
        title="Monthly car review"
        subtitle="Condition photos on file"
        primaryLabel={canCreate ? "New review" : undefined}
        onPrimary={canCreate ? () => {
          const driverId = user?.role === "driver" ? user.id : "";
          const assigned = driverId
            ? vehicles.find((row) => row.assigned_driver_id === driverId)?.id || ""
            : "";
          setForm((f) => ({ ...f, driver_id: driverId, vehicle_id: assigned }));
          setOpen(true);
        } : undefined}
        stats={[
          { id: "all", label: "Total", value: rows.length, tone: "blue", icon: "📷" },
          { id: "good", label: "Good", value: rows.filter((r) => r.condition === "good").length, tone: "green", icon: "✓" },
          { id: "fair", label: "Fair", value: rows.filter((r) => r.condition === "fair").length, tone: "amber", icon: "◐" },
          { id: "poor", label: "Poor", value: rows.filter((r) => r.condition === "poor").length, tone: "red", icon: "!" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
      <DataTable
        rows={filtered}
        loading={loading}
        noun="reviews"
        totalCount={rows.length}
        search={query}
        onSearch={setQuery}
        searchPlaceholder="Search reviews..."
        tabs={[
          { id: "all", label: "All" },
          { id: "good", label: "Good" },
          { id: "fair", label: "Fair" },
          { id: "poor", label: "Poor" },
        ]}
        tab={tab}
        onTab={setTab}
        columns={[
          {
            key: "vehicle",
            label: "Vehicle",
            render: (r) => {
              const vehicle = vehicleFor(r.vehicle_id);
              const src = vehicle?.photo_url || vehicle?.photos?.[0];
              return (
                <div className="fc-table__name-cell">
                  <Avatar src={src} name={vehicle?.registration || "V"} />
                  <span className="fc-table__id">{vehicle?.registration || "—"}</span>
                </div>
              );
            },
          },
          {
            key: "driver",
            label: "Driver",
            render: (r) => {
              const person = personFor(r.driver_id);
              return (
                <div className="fc-table__name-cell">
                  <Avatar src={person?.photo_url} name={person?.full_name || "D"} />
                  <span>{person?.full_name || "—"}</span>
                </div>
              );
            },
          },
          {
            key: "review_month",
            label: "Month",
            render: (r) => new Date(r.review_month || r.created_at).toLocaleDateString("en-ZA", { month: "short", year: "numeric" }),
          },
          { key: "condition", label: "Condition", render: (r) => <StatusChip value={r.condition} /> },
          { key: "notes", label: "Notes" },
          { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
          {
            key: "actions",
            label: "Actions",
            render: (r) => (
              <ActionIcons
                onView={() => navigate(`/reviews/${r.id}`)}
                onEdit={canManage ? () => openStatus(r) : undefined}
                onDelete={canDelete ? () => setPendingDelete(r) : undefined}
              />
            ),
          },
        ]}
      />
      </OpsPage>
      {editing ? (
        <Modal
          title="Update vehicle status"
          subtitle="Set the car status from this driver review."
          onClose={() => setEditing(null)}
        >
          <ReviewStatusForm
            vehicleStatus={vehicleStatus}
            reviewStatus={reviewStatus}
            note={reviewerNote}
            onVehicleStatus={setVehicleStatus}
            onReviewStatus={setReviewStatus}
            onNote={setReviewerNote}
            error={statusError}
            onCancel={() => setEditing(null)}
            onSave={saveStatus}
          />
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this review?"
        message={
          pendingDelete
            ? `This will permanently remove the ${
                vehicleFor(pendingDelete.vehicle_id)?.registration || "vehicle"
              } review for ${
                personFor(pendingDelete.driver_id)?.full_name || "this driver"
              }.`
            : ""
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          await api(`/api/reviews/${pendingDelete.id}`, { method: "DELETE" });
          setPendingDelete(null);
          setSuccess("Review was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
      {open ? (
        <ReviewFormModal
          vehicles={vehicles}
          drivers={people.filter((p) => p.role === "driver" || !p.role)}
          showDriver={user?.role !== "driver"}
          form={form}
          error={error}
          onChange={(next) => setForm((f) => ({ ...f, ...next }))}
          onPhoto={onPhoto}
          onClose={() => setOpen(false)}
          onSubmit={submit}
        />
      ) : null}
    </div>
  );
};

export default ReviewsPage;
