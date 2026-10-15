export const MAKE_MODELS = {
  Toyota: ["Hilux", "Quantum", "Corolla", "Fortuner", "Land Cruiser", "Avanza", "Starlet", "Rumion"],
  Volkswagen: ["Polo", "Golf", "Amarok", "T-Cross", "Caddy", "Transporter"],
  Ford: ["Ranger", "Everest", "EcoSport", "Transit", "Figo"],
  Isuzu: ["D-Max", "KB", "NPR", "mu-X"],
  Nissan: ["NP200", "Navara", "Almera", "X-Trail", "Hardbody"],
  "Mercedes-Benz": ["Sprinter", "Vito", "C-Class", "Actros"],
  Hyundai: ["i20", "Creta", "H100", "Tucson"],
  Kia: ["Picanto", "Rio", "Sportage", "K2700"],
  Mazda: ["Mazda2", "CX-5", "BT-50"],
  Honda: ["Fit", "Civic", "CR-V"],
  Suzuki: ["Swift", "Jimny", "Ertiga"],
  Mahindra: ["Bolero", "Pik Up", "Scorpio"],
  Hino: ["300", "500"],
  Chevrolet: ["Utility", "Spark"],
};

export const vehicleYearList = () => {
  const latest = new Date().getFullYear() + 1;
  const years = [];
  for (let year = latest; year >= 1990; year -= 1) years.push(year);
  return years;
};
