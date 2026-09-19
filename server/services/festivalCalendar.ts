/**
 * 2026 & Early 2027 Festival & Retail Event Calendar Database
 * Calibrated with realistic retail surge factors, prep lead-times, and affected categories.
 */

export interface FestivalEvent {
  id: string;
  name: string;
  tagline: string;
  startDate: string; // ISO format: YYYY-MM-DD
  endDate: string;
  preparationLeadDays: number; // How many days prior retailers must finalize stock
  primaryCategories: string[];
  secondaryCategories: string[];
  productKeywords: string[];
  surgeMultiplier: number; // Multiplier on standard baseline demand (e.g. 3.2 = 320% demand)
  demandDurationDays: number; // Duration of peak buying window
  season: "Q3_2026" | "Q4_2026" | "Q1_2027";
  region: "National" | "Global" | "Regional";
  importance: "CRITICAL" | "HIGH" | "MEDIUM";
  iconName: string;
  themeColor: string; // Tailwind-friendly accent
}

export const FESTIVAL_CALENDAR_2026: FestivalEvent[] = [
  {
    id: "FEST_2026_NAVRATRI",
    name: "Navratri & Durga Puja",
    tagline: "9-Night Festive Celebration & Fasting Peak",
    startDate: "2026-10-11",
    endDate: "2026-10-19",
    preparationLeadDays: 14,
    primaryCategories: ["Clothing", "Beauty", "Dairy", "Fruits & Vegetables", "Bakery"],
    secondaryCategories: ["Oils & Fats", "Grains & Pulses", "General"],
    productKeywords: ["sari", "kurta", "ethnic", "dress", "milk", "ghee", "fruit", "sweet", "dry fruit", "cosmetic", "beauty"],
    surgeMultiplier: 2.6,
    demandDurationDays: 12,
    season: "Q4_2026",
    region: "National",
    importance: "HIGH",
    iconName: "Flame",
    themeColor: "amber",
  },
  {
    id: "FEST_2026_DUSSEHRA",
    name: "Dussehra (Vijayadashami)",
    tagline: "Auspicious Buying for Tech, Vehicles & Appliances",
    startDate: "2026-10-20",
    endDate: "2026-10-21",
    preparationLeadDays: 10,
    primaryCategories: ["Electronics", "Technology", "Hardware", "Clothing"],
    secondaryCategories: ["Bakery", "Mechanical", "Electrical"],
    productKeywords: ["phone", "tv", "motor", "device", "appliance", "gold", "sweets", "wire", "audio"],
    surgeMultiplier: 2.4,
    demandDurationDays: 5,
    season: "Q4_2026",
    region: "National",
    importance: "HIGH",
    iconName: "Shield",
    themeColor: "orange",
  },
  {
    id: "FEST_2026_KARWA_CHAUTH",
    name: "Karwa Chauth",
    tagline: "Cosmetics, Jewelry & Festive Apparel Surge",
    startDate: "2026-10-28",
    endDate: "2026-10-28",
    preparationLeadDays: 10,
    primaryCategories: ["Beauty", "Clothing", "Bakery"],
    secondaryCategories: ["Fruits & Vegetables", "General"],
    productKeywords: ["cosmetic", "lipstick", "perfume", "saree", "makeup", "bangles", "mehendi", "dry fruit", "sweets"],
    surgeMultiplier: 2.8,
    demandDurationDays: 6,
    season: "Q4_2026",
    region: "National",
    importance: "HIGH",
    iconName: "Sparkles",
    themeColor: "rose",
  },
  {
    id: "FEST_2026_DIWALI",
    name: "Dhanteras & Diwali (Deepavali)",
    tagline: "Mega Annual Shopping Peak - 4x-5x Surge Across All Verticals",
    startDate: "2026-11-06",
    endDate: "2026-11-10",
    preparationLeadDays: 21,
    primaryCategories: ["Electronics", "Technology", "Furniture", "Clothing", "Bakery", "Dairy"],
    secondaryCategories: ["Oils & Fats", "Beauty", "General", "Office Supplies", "Electrical"],
    productKeywords: ["laptop", "gadget", "light", "lamp", "tv", "sweets", "gift", "dry fruit", "ghee", "sofa", "chair", "decor", "home", "chocolate", "ethnic"],
    surgeMultiplier: 4.2,
    demandDurationDays: 15,
    season: "Q4_2026",
    region: "National",
    importance: "CRITICAL",
    iconName: "Sun",
    themeColor: "yellow",
  },
  {
    id: "FEST_2026_CHHATH",
    name: "Chhath Puja & Dev Deepavali",
    tagline: "High-Volume Staples, Fruits & Traditional Offerings",
    startDate: "2026-11-15",
    endDate: "2026-11-17",
    preparationLeadDays: 10,
    primaryCategories: ["Fruits & Vegetables", "Grains & Pulses", "Dairy", "Oils & Fats"],
    secondaryCategories: ["Clothing", "General"],
    productKeywords: ["banana", "apple", "fruit", "wheat", "flour", "rice", "ghee", "milk", "sari", "cane"],
    surgeMultiplier: 2.3,
    demandDurationDays: 7,
    season: "Q4_2026",
    region: "Regional",
    importance: "MEDIUM",
    iconName: "Sunrise",
    themeColor: "amber",
  },
  {
    id: "FEST_2026_WEDDING_BFCM",
    name: "Peak Wedding Season & Black Friday",
    tagline: "High-Ticket Gifting, Luxury Apparel, Electronics & Banqueting",
    startDate: "2026-11-20",
    endDate: "2026-12-15",
    preparationLeadDays: 25,
    primaryCategories: ["Clothing", "Beauty", "Furniture", "Electronics", "Technology", "Beverages"],
    secondaryCategories: ["Bakery", "Seafood", "Dairy", "General"],
    productKeywords: ["suit", "sherwani", "lehenga", "makeup", "perfume", "wine", "drink", "table", "chair", "camera", "gift", "formal", "catering", "luxury"],
    surgeMultiplier: 3.4,
    demandDurationDays: 25,
    season: "Q4_2026",
    region: "National",
    importance: "CRITICAL",
    iconName: "HeartHandshake",
    themeColor: "purple",
  },
  {
    id: "FEST_2026_CHRISTMAS_NYE",
    name: "Christmas & New Year 2027",
    tagline: "Corporate Gifting, Confectionery, Beverages & Year-End Bash",
    startDate: "2026-12-20",
    endDate: "2027-01-02",
    preparationLeadDays: 18,
    primaryCategories: ["Bakery", "Beverages", "Electronics", "Clothing", "Technology"],
    secondaryCategories: ["Office Supplies", "Beauty", "General"],
    productKeywords: ["cake", "pastry", "wine", "beer", "champagne", "chocolate", "headphone", "audio", "jacket", "sweater", "planner", "gift", "party"],
    surgeMultiplier: 2.9,
    demandDurationDays: 14,
    season: "Q4_2026",
    region: "Global",
    importance: "CRITICAL",
    iconName: "Gift",
    themeColor: "red",
  },
  {
    id: "FEST_2027_SANKRANTI_REPUBLIC",
    name: "Makar Sankranti / Pongal & Republic Day",
    tagline: "Harvest Festival Staples & Big Winter Republic Day Sales",
    startDate: "2027-01-14",
    endDate: "2027-01-26",
    preparationLeadDays: 14,
    primaryCategories: ["Grains & Pulses", "Oils & Fats", "Electronics", "Clothing"],
    secondaryCategories: ["Bakery", "Dairy", "Technology"],
    productKeywords: ["rice", "jaggery", "sesame", "ghee", "apparel", "gadget", "discount", "sale", "sweets"],
    surgeMultiplier: 2.2,
    demandDurationDays: 12,
    season: "Q1_2027",
    region: "National",
    importance: "HIGH",
    iconName: "Flag",
    themeColor: "emerald",
  },
  {
    id: "FEST_2027_VALENTINES_SHIVRATRI",
    name: "Valentine's & Maha Shivratri",
    tagline: "Gifting, Luxury Fragrances, Fasting Milk & Produce",
    startDate: "2027-02-14",
    endDate: "2027-03-06",
    preparationLeadDays: 12,
    primaryCategories: ["Beauty", "Bakery", "Clothing", "Dairy", "Fruits & Vegetables"],
    secondaryCategories: ["Beverages", "Technology"],
    productKeywords: ["chocolate", "perfume", "cosmetic", "card", "rose", "milk", "fruit", "dress", "jewelry"],
    surgeMultiplier: 2.4,
    demandDurationDays: 10,
    season: "Q1_2027",
    region: "National",
    importance: "MEDIUM",
    iconName: "Heart",
    themeColor: "pink",
  },
  {
    id: "FEST_2027_HOLI_EID",
    name: "Holi & Ramadan / Eid ul-Fitr 2027",
    tagline: "Massive FMCG, Beverage, Dairy & Festive Attire Surge",
    startDate: "2027-03-22",
    endDate: "2027-03-31",
    preparationLeadDays: 16,
    primaryCategories: ["Beverages", "Dairy", "Bakery", "Clothing", "Grains & Pulses", "Oils & Fats"],
    secondaryCategories: ["Beauty", "Fruits & Vegetables", "General"],
    productKeywords: ["thandai", "milk", "sweets", "gujiya", "sharbat", "dates", "dry fruit", "kurta", "tshirt", "flour", "oil", "drink"],
    surgeMultiplier: 3.1,
    demandDurationDays: 10,
    season: "Q1_2027",
    region: "National",
    importance: "CRITICAL",
    iconName: "Palette",
    themeColor: "cyan",
  },
];

/**
 * Returns all upcoming events relative to a base date (defaults to current system date).
 */
export function getUpcomingEvents(referenceDate: Date = new Date("2026-09-18")): (FestivalEvent & {
  daysUntilStart: number;
  orderDeadlineDate: string;
  daysUntilOrderDeadline: number;
  status: "URGENT_ORDER" | "PREPARE_NOW" | "UPCOMING";
})[] {
  const refTime = referenceDate.getTime();

  return FESTIVAL_CALENDAR_2026
    .filter((event) => {
      const eventEnd = new Date(event.endDate).getTime();
      return eventEnd >= refTime; // Event has not ended yet
    })
    .map((event) => {
      const startDate = new Date(event.startDate);
      const diffTime = startDate.getTime() - refTime;
      const daysUntilStart = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Order deadline date = start date minus preparation lead days
      const deadlineDate = new Date(startDate);
      deadlineDate.setDate(deadlineDate.getDate() - event.preparationLeadDays);
      const deadlineDiff = deadlineDate.getTime() - refTime;
      const daysUntilOrderDeadline = Math.ceil(deadlineDiff / (1000 * 60 * 60 * 24));

      let status: "URGENT_ORDER" | "PREPARE_NOW" | "UPCOMING" = "UPCOMING";
      if (daysUntilOrderDeadline <= 7) {
        status = "URGENT_ORDER";
      } else if (daysUntilOrderDeadline <= 25) {
        status = "PREPARE_NOW";
      }

      return {
        ...event,
        daysUntilStart,
        orderDeadlineDate: deadlineDate.toISOString().slice(0, 10),
        daysUntilOrderDeadline,
        status,
      };
    })
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart);
}
