import { NextResponse } from "next/server";
import { utcToZonedTime, format } from "date-fns-tz";
import crypto from "crypto";
import {
  pickCity,
  createPoemHTML,
  savePoem,
  parisDateId,
  poemExistsForParisDate,
} from "@/lib/poems";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const visible = url.searchParams.get("visible") === "1";
    const force = url.searchParams.get("force") === "1";
    const forcedCity = url.searchParams.get("city")?.trim();

    const now = new Date();
    const parisNow = utcToZonedTime(now, "Europe/Paris");
    const dayId = parisDateId(parisNow);

    if (!force && (await poemExistsForParisDate(dayId))) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    let publishedAt: string;
    if (visible) {
      const visibleParis = new Date(parisNow.getTime() - 1000);
      publishedAt = format(visibleParis, "yyyy-MM-dd'T'HH:mm:ssXXX", {
        timeZone: "Europe/Paris",
      });
    } else {
      const fifteen = new Date(parisNow);
      fifteen.setHours(15, 0, 0, 0);
      publishedAt = format(fifteen, "yyyy-MM-dd'T'HH:mm:ssXXX", {
        timeZone: "Europe/Paris",
      });
    }

    const city =
      forcedCity && forcedCity.length > 0 ? forcedCity : await pickCity();
    const html = await createPoemHTML(city);

    const poem = {
      id: crypto.randomUUID(),
      city,
      html,
      publishedAt,
    };

    await savePoem(poem);

    return NextResponse.json({ ok: true, poem });
  } catch (err) {
    console.error("[manual-generate] error:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 200 });
  }
}
