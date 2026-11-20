export interface TrustedReference {
  name: string;
  role: string;
  url: string;
}

export const TRUSTED_HEALTH_AND_RECIPE_REFERENCES: TrustedReference[] = [
  {
    name: "American Diabetes Association — Diabetes Food Hub",
    role: "Diabetes-conscious recipes and meal ideas",
    url: "https://diabetesfoodhub.org/",
  },
  {
    name: "EatingWell",
    role: "Balanced, approachable healthy recipes",
    url: "https://www.eatingwell.com/",
  },
  {
    name: "ACOG (American College of Obstetricians and Gynecologists)",
    role: "Pregnancy nutrition and medical guidance",
    url: "https://www.acog.org/womens-health/faqs/nutrition-during-pregnancy",
  },
  {
    name: "FoodSafety.gov",
    role: "Pregnancy food-safety recommendations and cooking temperatures",
    url: "https://www.foodsafety.gov/people-at-risk/pregnant-women",
  },
  {
    name: "USDA FoodData Central",
    role: "Public-domain ingredient nutrition reference database",
    url: "https://fdc.nal.usda.gov/",
  },
];

