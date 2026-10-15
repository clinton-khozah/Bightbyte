import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layout/AppLayout/AppLayout";
import LoginPage from "./pages/LoginPage/LoginPage";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage/VehiclesPage";
import VehicleDetailPage from "./pages/VehicleDetailPage/VehicleDetailPage";
import DriversPage from "./pages/DriversPage/DriversPage";
import UserDetailPage from "./pages/UserDetailPage/UserDetailPage";
import RolesRightsPage from "./pages/RolesRightsPage/RolesRightsPage";
import CompaniesPage from "./pages/CompaniesPage/CompaniesPage";
import CheckinsPage from "./pages/CheckinsPage/CheckinsPage";
import CheckinDetailPage from "./pages/CheckinDetailPage/CheckinDetailPage";
import CheckinSchedulePage from "./pages/CheckinSchedulePage/CheckinSchedulePage";
import MechanicsPage from "./pages/MechanicsPage/MechanicsPage";
import ReviewsPage from "./pages/ReviewsPage/ReviewsPage";
import ReviewDetailPage from "./pages/ReviewDetailPage/ReviewDetailPage";
import IncidentsPage from "./pages/IncidentsPage/IncidentsPage";
import MaintenancePage from "./pages/MaintenancePage/MaintenancePage";
import DocumentsPage from "./pages/DocumentsPage/DocumentsPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/vehicles" element={<VehiclesPage />} />
      <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
      <Route path="/drivers" element={<DriversPage />} />
      <Route path="/drivers/:id" element={<UserDetailPage />} />
      <Route path="/roles-rights" element={<RolesRightsPage />} />
      <Route path="/companies" element={<CompaniesPage />} />
      <Route path="/checkins" element={<CheckinsPage />} />
      <Route path="/checkins/schedules" element={<CheckinSchedulePage />} />
      <Route path="/checkins/:id" element={<CheckinDetailPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/reviews/:id" element={<ReviewDetailPage />} />
      <Route path="/incidents" element={<IncidentsPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/mechanics" element={<MechanicsPage />} />
      <Route path="/documents" element={<DocumentsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default App;
