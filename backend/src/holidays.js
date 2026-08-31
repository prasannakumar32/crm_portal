const express = require("express");

const router = express.Router();

const COUNTRY_NAMES = { IN: "India", AU: "Australia" };

const FALLBACK_HOLIDAYS = {
  IN: [
    ["Republic Day", "01-26"],
    ["Holi", "03-14"],
    ["Independence Day", "08-15"],
    ["Gandhi Jayanti", "10-02"],
    ["Diwali", "10-20"],
    ["Christmas Day", "12-25"],
  ],
  AU: [
    ["Australia Day", "01-26"],
    ["Good Friday", "04-03"],
    ["Easter Monday", "04-06"],
    ["Anzac Day", "04-25"],
    ["King's Birthday", "06-08"],
    ["Christmas Day", "12-25"],
    ["Boxing Day", "12-26"],
  ],
};

function fallbackHolidays(country, year) {
  return FALLBACK_HOLIDAYS[country].map(([name, monthDay]) => ({
    date: `${year}-${monthDay}`,
    localName: name,
    name,
    countryCode: country,
    country: COUNTRY_NAMES[country],
    global: true,
    types: ["Public"],
  }));
}

router.get("/", async (req, res) => {
  const country = String(req.query.country || "IN").trim().toUpperCase();
  const year = Number(req.query.year || new Date().getFullYear());

  if (!COUNTRY_NAMES[country]) {
    return res.status(400).json({ error: "Country must be IN or AU." });
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ error: "Year must be between 2000 and 2100." });
  }

  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
    if (!response.ok) throw new Error(`Holiday provider returned ${response.status}`);
    const responseBody = await response.text();
    if (!responseBody.trim()) throw new Error("Holiday provider returned an empty response");

    let holidays;
    try {
      holidays = JSON.parse(responseBody);
    } catch {
      throw new Error("Holiday provider returned invalid JSON");
    }
    if (!Array.isArray(holidays)) throw new Error("Holiday provider returned an invalid holiday list");

    return res.json({ country, countryName: COUNTRY_NAMES[country], year, source: "calendar", holidays });
  } catch (error) {
    return res.json({ country, countryName: COUNTRY_NAMES[country], year, source: "fallback", holidays: fallbackHolidays(country, year) });
  }
});

module.exports = router;