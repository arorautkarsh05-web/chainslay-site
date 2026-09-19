import { pool } from "../config/database";
import {
  FESTIVAL_CALENDAR_2026,
  FestivalEvent,
  getUpcomingEvents,
} from "./festivalCalendar";
import {
  INDEPENDENT_FESTIVAL_PRODUCTS,
  FESTIVAL_CULTURAL_BRIEFINGS,
  FestiveProduct,
  FestivalCulturalBriefing,
} from "./festivalProductsCatalog";

export type StoreScale = "SMALL" | "MEDIUM" | "ENTERPRISE";

export interface IndependentRecommendationOutput {
  id: string;
  festivalId: string;
  festivalName: string;
  productName: string;
  subCategory: string;
  occasionTag?: "VALENTINE" | "SHIVRATRI" | "GENERAL";
  significanceTag: string;
  culturalSignificance: string;
  targetAudience: string;
  demandSurgeLevel: string;
  demandMultiplier: number;
  complianceTag: string;
  wholesaleCost: number;
  suggestedMSRP: number;
  profitMarginPercent: number;
  recommendedUnits: number;
  totalWholesaleInvestment: number;
  expectedRevenue: number;
  expectedProfit: number;
  orderDeadline: string;
  daysUntilDeadline: number;
  urgency: "CRITICAL_NOW" | "ORDER_SOON" | "PREPARE";
  iconType: string;
}

/**
 * Returns independent, culturally-significant festival product recommendations.
 * Does NOT depend on uploaded user inventory.
 */
export function getIndependentFestivalRecommendations(options: {
  festivalId?: string;
  subCategory?: string;
  occasionTag?: "VALENTINE" | "SHIVRATRI" | "ALL";
  storeScale?: StoreScale;
  search?: string;
  page?: number;
  limit?: number;
  referenceDate?: Date;
}): {
  items: IndependentRecommendationOutput[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  culturalBriefing: FestivalCulturalBriefing;
  storeScale: StoreScale;
  aggregateMetrics: {
    totalProductsCount: number;
    totalUnitsToOrder: number;
    totalCapitalInvestment: number;
    totalProjectedRevenue: number;
    totalProjectedProfit: number;
    avgProfitMargin: number;
  };
} {
  const refDate = options.referenceDate || new Date("2026-09-18");
  const upcomingEvents = getUpcomingEvents(refDate);

  const activeFestivalId =
    options.festivalId || upcomingEvents[0]?.id || "FEST_2026_NAVRATRI";
  const scale = options.storeScale || "MEDIUM";

  // Get all independent products for this festival (with alias support for Valentine / Shivratri)
  let matched = INDEPENDENT_FESTIVAL_PRODUCTS.filter((p) => {
    if (activeFestivalId === "FEST_2027_VALENTINES") {
      return p.festivalId === "FEST_2027_VALENTINES_SHIVRATRI" && p.occasionTag === "VALENTINE";
    }
    if (activeFestivalId === "FEST_2027_SHIVRATRI") {
      return p.festivalId === "FEST_2027_VALENTINES_SHIVRATRI" && p.occasionTag === "SHIVRATRI";
    }
    return p.festivalId === activeFestivalId;
  });

  // If none found for custom festival, fallback to first available
  if (matched.length === 0) {
    matched = INDEPENDENT_FESTIVAL_PRODUCTS.slice(0, 10);
  }

  // Filter by occasionTag (e.g. VALENTINE vs SHIVRATRI)
  if (options.occasionTag && options.occasionTag !== "ALL") {
    matched = matched.filter((p) => p.occasionTag === options.occasionTag);
  }

  // Filter by subcategory
  if (options.subCategory && options.subCategory !== "ALL") {
    matched = matched.filter(
      (p) => p.subCategory.toLowerCase() === options.subCategory!.toLowerCase()
    );
  }

  // Filter by search
  if (options.search) {
    const q = options.search.toLowerCase();
    matched = matched.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.subCategory.toLowerCase().includes(q) ||
        p.significanceTag.toLowerCase().includes(q) ||
        p.culturalSignificance.toLowerCase().includes(q) ||
        (p.occasionTag && p.occasionTag.toLowerCase().includes(q))
    );
  }

  // Map to store scale and calculate financials
  const formattedItems: IndependentRecommendationOutput[] = matched.map((p) => {
    let units = p.recommendedUnitsMedium;
    if (scale === "SMALL") units = p.recommendedUnitsSmall;
    if (scale === "ENTERPRISE") units = p.recommendedUnitsEnterprise;

    const totalWholesaleInvestment = units * p.wholesaleCost;
    const expectedRevenue = units * p.suggestedMSRP;
    const expectedProfit = expectedRevenue - totalWholesaleInvestment;

    const deadlineDate = new Date(p.orderDeadline);
    const daysUntilDeadline = Math.ceil(
      (deadlineDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let urgency: "CRITICAL_NOW" | "ORDER_SOON" | "PREPARE" = "PREPARE";
    if (daysUntilDeadline <= 7) urgency = "CRITICAL_NOW";
    else if (daysUntilDeadline <= 25) urgency = "ORDER_SOON";

    return {
      id: p.id,
      festivalId: p.festivalId,
      festivalName: p.festivalName,
      productName: p.productName,
      subCategory: p.subCategory,
      occasionTag: p.occasionTag || "GENERAL",
      significanceTag: p.significanceTag,
      culturalSignificance: p.culturalSignificance,
      targetAudience: p.targetAudience,
      demandSurgeLevel: p.demandSurgeLevel,
      demandMultiplier: p.demandMultiplier,
      complianceTag: p.complianceTag,
      wholesaleCost: p.wholesaleCost,
      suggestedMSRP: p.suggestedMSRP,
      profitMarginPercent: p.profitMarginPercent,
      recommendedUnits: units,
      totalWholesaleInvestment,
      expectedRevenue,
      expectedProfit,
      orderDeadline: p.orderDeadline,
      daysUntilDeadline,
      urgency,
      iconType: p.iconType,
    };
  });

  // Calculate aggregates
  const totalUnitsToOrder = formattedItems.reduce(
    (acc, it) => acc + it.recommendedUnits,
    0
  );
  const totalCapitalInvestment = formattedItems.reduce(
    (acc, it) => acc + it.totalWholesaleInvestment,
    0
  );
  const totalProjectedRevenue = formattedItems.reduce(
    (acc, it) => acc + it.expectedRevenue,
    0
  );
  const totalProjectedProfit = formattedItems.reduce(
    (acc, it) => acc + it.expectedProfit,
    0
  );
  const avgProfitMargin =
    formattedItems.length > 0
      ? Number(
          (
            formattedItems.reduce(
              (acc, it) => acc + it.profitMarginPercent,
              0
            ) / formattedItems.length
          ).toFixed(1)
        )
      : 0;

  // Pagination
  const page = options.page || 1;
  const limit = options.limit || 20;
  const total = formattedItems.length;
  const totalPages = Math.ceil(total / limit);
  const paginated = formattedItems.slice((page - 1) * limit, page * limit);

  const culturalBriefing =
    FESTIVAL_CULTURAL_BRIEFINGS[activeFestivalId] ||
    FESTIVAL_CULTURAL_BRIEFINGS["FEST_2026_NAVRATRI"];

  return {
    items: paginated,
    total,
    page,
    limit,
    totalPages,
    culturalBriefing,
    storeScale: scale,
    aggregateMetrics: {
      totalProductsCount: total,
      totalUnitsToOrder,
      totalCapitalInvestment,
      totalProjectedRevenue,
      totalProjectedProfit,
      avgProfitMargin,
    },
  };
}

/**
 * Creates a formal purchase approval for an independent festive product.
 * Queues into approval_requests table so the manager can review and log to blockchain.
 */
export async function queueIndependentFestivalOrderApproval(data: {
  productId: string;
  productName: string;
  festivalId: string;
  festivalName: string;
  recommendedQuantity: number;
  estimatedCost: number;
  significanceTag?: string;
  requestedBy?: string;
}): Promise<{ id: number; message: string }> {
  const reasonText = `Festival Procurement for ${data.festivalName} (2026): Procure ${data.recommendedQuantity} units of "${data.productName}" [${data.significanceTag || "Festive Stock"}] at est. ₹${data.estimatedCost.toLocaleString()}.`;

  const [res]: any = await pool.query(
    `INSERT INTO approval_requests (
      inventory_item_id, sku, product_name, reason, excess_quantity, excess_value, status, approved_by
    ) VALUES (NULL, ?, ?, ?, ?, ?, 'PENDING', ?)`,
    [
      data.productId,
      data.productName,
      reasonText,
      data.recommendedQuantity,
      data.estimatedCost,
      data.requestedBy || "AI Festival Merchandiser",
    ]
  );

  return {
    id: res.insertId,
    message: `Purchase request for "${data.productName}" (${data.recommendedQuantity} units) successfully queued for Manager Review.`,
  };
}
