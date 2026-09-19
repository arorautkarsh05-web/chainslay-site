import { Request, Response } from "express";
import { getUpcomingEvents, FESTIVAL_CALENDAR_2026 } from "../services/festivalCalendar";
import {
  getIndependentFestivalRecommendations,
  queueIndependentFestivalOrderApproval,
  StoreScale,
} from "../services/festivalMLService";
import { FESTIVAL_CULTURAL_BRIEFINGS } from "../services/festivalProductsCatalog";

const SYSTEM_REFERENCE_DATE = new Date("2026-09-18");

export const getCalendar = async (req: Request, res: Response) => {
  try {
    const upcoming = getUpcomingEvents(SYSTEM_REFERENCE_DATE);
    res.json({
      success: true,
      data: {
        currentDate: "2026-09-18",
        events: upcoming,
        allEvents: FESTIVAL_CALENDAR_2026,
      },
    });
  } catch (error: any) {
    console.error("[FESTIVAL_CONTROLLER] Error getting calendar:", error);
    res.status(500).json({ success: false, message: "Failed to fetch festival calendar" });
  }
};

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const { festivalId, subCategory, occasionTag, scale, search, page, limit } = req.query;

    const result = getIndependentFestivalRecommendations({
      festivalId: festivalId as string,
      subCategory: subCategory as string,
      occasionTag: occasionTag as any,
      storeScale: (scale as StoreScale) || "MEDIUM",
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
      referenceDate: SYSTEM_REFERENCE_DATE,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[FESTIVAL_CONTROLLER] Error calculating recommendations:", error);
    res.status(500).json({ success: false, message: "Failed to calculate festival recommendations" });
  }
};

export const getSummary = async (req: Request, res: Response) => {
  try {
    const upcomingEvents = getUpcomingEvents(SYSTEM_REFERENCE_DATE);
    const activeEvent = upcomingEvents[0] || FESTIVAL_CALENDAR_2026[0];

    const recs = getIndependentFestivalRecommendations({
      festivalId: activeEvent.id,
      storeScale: "MEDIUM",
      page: 1,
      limit: 100,
      referenceDate: SYSTEM_REFERENCE_DATE,
    });

    res.json({
      success: true,
      data: {
        referenceDate: "2026-09-18",
        activeFestival: activeEvent,
        culturalBriefing: recs.culturalBriefing,
        metrics: recs.aggregateMetrics,
        upcomingEvents,
      },
    });
  } catch (error: any) {
    console.error("[FESTIVAL_CONTROLLER] Error getting summary:", error);
    res.status(500).json({ success: false, message: "Failed to fetch festival summary" });
  }
};

export const createReorderApproval = async (req: Request, res: Response) => {
  try {
    const { productId, productName, festivalId, festivalName, recommendedQuantity, estimatedCost, significanceTag } = req.body;

    if (!productId || !productName || !recommendedQuantity) {
      return res.status(400).json({
        success: false,
        message: "productId, productName, and recommendedQuantity are required",
      });
    }

    const result = await queueIndependentFestivalOrderApproval({
      productId: String(productId),
      productName: String(productName),
      festivalId: festivalId || "FEST_2026_GENERIC",
      festivalName: festivalName || "Upcoming 2026 Festival",
      recommendedQuantity: Number(recommendedQuantity),
      estimatedCost: Number(estimatedCost || 0),
      significanceTag,
      requestedBy: "AI Festival Merchandiser (2026)",
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[FESTIVAL_CONTROLLER] Error creating reorder approval:", error);
    res.status(500).json({ success: false, message: "Failed to queue reorder approval" });
  }
};
