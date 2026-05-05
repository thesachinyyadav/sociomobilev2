import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import advancedFormat from "dayjs/plugin/advancedFormat";

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);

export { dayjs };

/** "Jan 15, 2026" */
export function formatDateUTC(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBD";
  return dayjs.utc(dateStr).format("MMM D, YYYY");
}

/** "Mon, Jan 15" — compact for cards */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBD";
  return dayjs.utc(dateStr).format("ddd, MMM D");
}

/** "HH:mm:ss" → "5:30 PM" */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/** Days until deadline. null = no deadline (open). negative = past. */
export function getDaysUntil(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  return dayjs.utc(deadline).startOf("day").diff(dayjs.utc().startOf("day"), "day");
}

export function isDeadlinePassed(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  return dayjs.utc(deadline).isBefore(dayjs.utc());
}

/** "2 hours ago", "3 days ago" */
export function timeAgo(date: string): string {
  return dayjs(date).fromNow();
}

/** "Jan 15 - Jan 20, 2026" */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return "Dates TBD";
  const s = dayjs.utc(start);
  if (!end || start === end) return s.format("MMM D, YYYY");
  const e = dayjs.utc(end);
  if (s.year() === e.year() && s.month() === e.month()) {
    return `${s.format("MMM D")} – ${e.format("D, YYYY")}`;
  }
  return `${s.format("MMM D")} – ${e.format("MMM D, YYYY")}`;
}

export const generateGoogleCalendarUrl = (title: string, date: string, time?: string): string | null => {
  try {
    const dateObj = dayjs(date);
    let startDateTime: string;
    let endDateTime: string;
    if (time) {
      const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3]?.toUpperCase();
        if (period === "PM" && hours < 12) hours += 12;
        else if (period === "AM" && hours === 12) hours = 0;
        const startDate = dateObj.hour(hours).minute(minutes);
        startDateTime = startDate.format("YYYYMMDDTHHmmss");
        endDateTime = startDate.add(1, "hour").format("YYYYMMDDTHHmmss");
      } else {
        startDateTime = dateObj.format("YYYYMMDD");
        endDateTime = dateObj.add(1, "day").format("YYYYMMDD");
      }
    } else {
      startDateTime = dateObj.format("YYYYMMDD");
      endDateTime = dateObj.add(1, "day").format("YYYYMMDD");
    }
    const params = new URLSearchParams({ text: title, dates: `${startDateTime}/${endDateTime}` });
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&${params.toString()}`;
  } catch {
    return null;
  }
};
