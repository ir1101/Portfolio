import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

export function istTime() {
  return fmt.format(new Date());
}

/** IST HH:MM, re-rendering on the minute boundary rather than polling. */
export function useIstClock() {
  const [time, setTime] = useState(istTime);
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      const ms = 60_000 - (Date.now() % 60_000) + 50;
      timer = window.setTimeout(() => {
        setTime(istTime());
        schedule();
      }, ms);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);
  return time;
}
