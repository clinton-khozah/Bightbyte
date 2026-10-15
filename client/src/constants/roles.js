import { ALL_NAV } from "./nav";

export const FLEET21_MODULES = ALL_NAV.map(({ id, label }) => ({ id, label }));

export const ROLE_ACTIONS = [
  { id: "view", label: "View" },
  { id: "create", label: "Create" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];

export const emptyMatrix = () =>
  Object.fromEntries(
    FLEET21_MODULES.map((mod) => [
      mod.id,
      { view: false, create: false, edit: false, delete: false },
    ]),
  );

export const summariseMatrix = (matrix = {}) => {
  const viewed = FLEET21_MODULES.filter((mod) => matrix[mod.id]?.view).map((m) => m.label);
  if (!viewed.length) return "No access";
  if (viewed.length === FLEET21_MODULES.length) return "All modules";
  return viewed.slice(0, 3).join(" · ") + (viewed.length > 3 ? "…" : "");
};
