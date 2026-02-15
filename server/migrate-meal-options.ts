import { db } from "./db";
import { roomOptions } from "@shared/schema";
import { eq } from "drizzle-orm";

const MEAL_NAME_MAPPING: Record<string, string> = {
  "Room Only": "Room Only (Best Price)",
  "Half Board": "Breakfast + Dinner/Lunch",
  "Full Board": "All Meals Included",
};

export async function migrateMealOptionNames() {
  try {
    for (const [oldName, newName] of Object.entries(MEAL_NAME_MAPPING)) {
      const result = await db
        .update(roomOptions)
        .set({ name: newName })
        .where(eq(roomOptions.name, oldName));
    }
    console.log("Meal option names migration completed");
  } catch (error) {
    console.error("Error migrating meal option names:", error);
  }
}
