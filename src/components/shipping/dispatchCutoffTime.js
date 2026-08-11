export const DISPATCH_TIME_ZONE = "America/Denver";
export const DISPATCH_CUTOFF_HOUR = 16;

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPATCH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const dispatchDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPATCH_TIME_ZONE,
  weekday: "long",
  month: "short",
  day: "numeric",
});

function getZonedParts(date) {
  return zonedPartsFormatter.formatToParts(date).reduce((parts, part) => {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
    return parts;
  }, {});
}

function zonedDateTimeToUtc({ year, month, day, hour, minute = 0, second = 0 }) {
  const intendedUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let result = intendedUtc;

  // Two passes also cover daylight-saving offsets around the target date.
  for (let pass = 0; pass < 2; pass += 1) {
    const actual = getZonedParts(new Date(result));
    const representedUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    result += intendedUtc - representedUtc;
  }

  return result;
}

function addCalendarDays({ year, month, day }, amount) {
  const adjusted = new Date(Date.UTC(year, month - 1, day + amount));

  return {
    year: adjusted.getUTCFullYear(),
    month: adjusted.getUTCMonth() + 1,
    day: adjusted.getUTCDate(),
  };
}

export function getDispatchCutoffState(now = new Date()) {
  const mountainNow = getZonedParts(now);
  const cutoffAt = zonedDateTimeToUtc({
    year: mountainNow.year,
    month: mountainNow.month,
    day: mountainNow.day,
    hour: DISPATCH_CUTOFF_HOUR,
  });
  const remainingMs = Math.max(0, cutoffAt - now.getTime());
  const beforeCutoff = remainingMs > 0;
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const nextMountainDate = addCalendarDays(mountainNow, 1);
  const nextProcessingAt = zonedDateTimeToUtc({
    ...nextMountainDate,
    hour: 12,
  });

  return {
    beforeCutoff,
    hours,
    minutes,
    seconds,
    nextProcessingDate: dispatchDateFormatter.format(
      new Date(nextProcessingAt)
    ),
  };
}

export function padDispatchTime(value) {
  return String(value).padStart(2, "0");
}
