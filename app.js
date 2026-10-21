function savePreference(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
}
function loadPreference(name, allowed, fallback) {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(name + "="));
  if (cookie) {
    const value = cookie.slice(name.length + 1);
    return allowed.includes(value) ? value : fallback;
  }
  // Preserve settings saved before preferences moved to cookies.
  try {
    const previous = localStorage.getItem(name);
    if (allowed.includes(previous)) {
      savePreference(name, previous);
      if (document.cookie.split("; ").includes(name + "=" + previous))
        localStorage.removeItem(name);
      return previous;
    }
  } catch {}
  return fallback;
}
const $ = (id) => document.getElementById(id);
const dayMs = 86400000;
function day(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function add(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function monday(d) {
  return add(day(d), -((d.getDay() + 6) % 7));
}
function iso(d) {
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  u.setUTCDate(u.getUTCDate() + 4 - (u.getUTCDay() || 7));
  const y = u.getUTCFullYear();
  return {
    year: y,
    week: Math.ceil(((u - new Date(Date.UTC(y, 0, 1))) / dayMs + 1) / 7),
  };
}
function key(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Gregorian Easter, used for Poland's movable public holidays.
function easter(y) {
  const a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}
function holidays(y) {
  const map = new Map();
  const fixed = [
    [1, 1, "New Year's Day"],
    [1, 6, "Epiphany"],
    [5, 1, "Labour Day"],
    [5, 3, "Constitution Day"],
    [8, 15, "Assumption of Mary"],
    [11, 1, "All Saints’ Day"],
    [11, 11, "Independence Day"],
    [12, 25, "Christmas Day"],
    [12, 26, "Second day of Christmas"],
  ];
  if (y >= 2025) fixed.push([12, 24, "Christmas Eve"]);
  for (const [m, d, name] of fixed) map.set(key(new Date(y, m - 1, d)), name);
  const e = easter(y);
  for (const [offset, name] of [
    [0, "Easter Sunday"],
    [1, "Easter Monday"],
    [49, "Pentecost"],
    [60, "Corpus Christi"],
  ])
    map.set(key(add(e, offset)), name);
  return map;
}
let country = loadPreference(
  "weekday-country",
  ["PL", "US", "BR", "none"],
  "PL",
);
$("country").value = country;
function usHolidays(y) {
  const map = new Map();
  const nth = (month, weekday, n) => {
    const first = new Date(y, month - 1, 1);
    return new Date(
      y,
      month - 1,
      1 + ((weekday - first.getDay() + 7) % 7) + 7 * (n - 1),
    );
  };
  const put = (d, name) => map.set(key(d), name);
  for (const year of [y - 1, y, y + 1]) {
    const fixed = [
      [1, 1, "New Year's Day"],
      [6, 19, "Juneteenth National Independence Day"],
      [7, 4, "Independence Day"],
      [11, 11, "Veterans Day"],
      [12, 25, "Christmas Day"],
    ];
    for (const [m, d, name] of fixed) {
      if (m === 6 && year < 2021) continue;
      const date = new Date(year, m - 1, d);
      put(date, name);
      if (date.getDay() === 6) put(add(date, -1), name + " (observed)");
      if (date.getDay() === 0) put(add(date, 1), name + " (observed)");
    }
  }
  for (const [m, w, n, name] of [
    [1, 1, 3, "Martin Luther King Jr. Day"],
    [2, 1, 3, "Washington’s Birthday"],
    [9, 1, 1, "Labor Day"],
    [10, 1, 2, "Columbus Day"],
    [11, 4, 4, "Thanksgiving Day"],
  ])
    put(nth(m, w, n), name);
  const lastMay = new Date(y, 4, 31);
  put(add(lastMay, -((lastMay.getDay() + 6) % 7)), "Memorial Day");
  return map;
}
function brHolidays(y) {
  const map = new Map();
  for (const [m, d, name] of [
    [1, 1, "Confraternização Universal"],
    [4, 21, "Tiradentes"],
    [5, 1, "Dia do Trabalho"],
    [9, 7, "Independência do Brasil"],
    [10, 12, "Nossa Senhora Aparecida"],
    [11, 2, "Finados"],
    [11, 15, "Proclamação da República"],
    [11, 20, "Dia da Consciência Negra"],
    [12, 25, "Natal"],
  ])
    map.set(key(new Date(y, m - 1, d)), name);
  map.set(key(add(easter(y), -2)), "Paixão de Cristo");
  return map;
}
function rawHoliday(d) {
  return country === "PL"
    ? holidays(d.getFullYear()).get(key(d))
    : country === "US"
      ? usHolidays(d.getFullYear()).get(key(d))
      : country === "BR"
        ? brHolidays(d.getFullYear()).get(key(d))
        : null;
}
function holiday(d) {
  const name = rawHoliday(d);
  return name ? translateHoliday(name) : null;
}
let weekSystem = loadPreference("weekday-system", ["iso", "us"], "iso");
$("week-system").value = weekSystem;
function weekStart(d) {
  return weekSystem === "us" ? add(day(d), -d.getDay()) : monday(d);
}
function weekInfo(d) {
  if (weekSystem === "iso") return iso(d);
  const y = add(weekStart(d), 6).getFullYear(),
    first = weekStart(new Date(y, 0, 1));
  return {
    year: y,
    week:
      1 +
      Math.round(
        (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
          Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) /
          (7 * dayMs),
      ),
  };
}
let start = weekStart(new Date());
let locale = loadPreference(
  "weekday-locale",
  ["en-GB", "pl-PL", "pt-BR"],
  "en-GB",
);
if (!["en-GB", "pl-PL", "pt-BR"].includes(locale)) locale = "en-GB";
$("locale").value = locale;
const translations = {
  "en-GB": {
    appearance: "Appearance:",
    light: "Light",
    dark: "Dark",
    weekPage: "Calendar week",
    holidayPage: "Holidays",
    settings: "Settings",
    pages: "Pages",
    weeks: "Weeks:",
    holidays: "Holidays:",
    language: "Language:",
    heading: "What week is it?",
    annual: "Year calendar & holidays",
    year: "Year",
    yearNote:
      "2026–2035 · Holiday dates follow current rules; future changes may apply. Select a date to view its week.",
    week: "week",
    current: "Current week",
    past: "Past week",
    upcoming: "Upcoming week",
    today: "Today",
    completed: "Completed",
    thisWeek: "This week",
    previous: "Previous week",
    next: "Next week",
    iso: "ISO · Monday",
    us: "US · Sunday",
    PL: "Poland",
    BR: "Brazil",
    US: "United States (federal)",
    none: "None",
    notePL: "",
    noteUS:
      "US federal holidays, including observed dates. State holidays are not included.",
    noteBR:
      "Brazil: national holidays and Good Friday. Local holidays and optional days (Carnival, Corpus Christi) are not included.",
    notenone: "Public holidays hidden.",
    navigation: "Week navigation",
    selected: "Selected calendar week",
    observed: "observed",
  },
  "pl-PL": {
    appearance: "Wygląd:",
    light: "Jasny",
    dark: "Ciemny",
    weekPage: "Tydzień kalendarzowy",
    holidayPage: "Święta",
    settings: "Ustawienia",
    pages: "Strony",
    weeks: "Tygodnie:",
    holidays: "Święta:",
    language: "Język:",
    heading: "Który mamy tydzień?",
    annual: "Kalendarz roczny i święta",
    year: "Rok",
    yearNote:
      "2026–2035 · Daty świąt według obecnych zasad; w przyszłości mogą się zmienić. Wybierz datę, aby zobaczyć jej tydzień.",
    week: "tydzień",
    current: "Bieżący tydzień",
    past: "Miniony tydzień",
    upcoming: "Przyszły tydzień",
    today: "Dzisiaj",
    completed: "Zakończony",
    thisWeek: "Ten tydzień",
    previous: "Poprzedni tydzień",
    next: "Następny tydzień",
    iso: "ISO · poniedziałek",
    us: "USA · niedziela",
    PL: "Polska",
    BR: "Brazylia",
    US: "Stany Zjednoczone (federalne)",
    none: "Brak",
    notePL: "",
    noteUS: "Święta federalne USA, także dni zastępcze. Bez świąt stanowych.",
    noteBR:
      "Brazylia: święta ogólnokrajowe i Wielki Piątek. Bez świąt lokalnych i dni fakultatywnych (karnawał, Boże Ciało).",
    notenone: "Święta są ukryte.",
    navigation: "Nawigacja tygodni",
    selected: "Wybrany tydzień",
    observed: "dzień zastępczy",
  },
  "pt-BR": {
    appearance: "Aparência:",
    light: "Claro",
    dark: "Escuro",
    weekPage: "Semana do ano",
    holidayPage: "Feriados",
    settings: "Configurações",
    pages: "Páginas",
    weeks: "Semanas:",
    holidays: "Feriados:",
    language: "Idioma:",
    heading: "Em que semana estamos?",
    annual: "Calendário anual e feriados",
    year: "Ano",
    yearNote:
      "2026–2035 · Datas conforme as regras atuais; podem mudar no futuro. Selecione uma data para ver sua semana.",
    week: "semana",
    current: "Semana atual",
    past: "Semana passada",
    upcoming: "Próxima semana",
    today: "Hoje",
    completed: "Concluído",
    thisWeek: "Esta semana",
    previous: "Semana anterior",
    next: "Próxima semana",
    iso: "ISO · segunda-feira",
    us: "EUA · domingo",
    PL: "Polônia",
    BR: "Brasil",
    US: "Estados Unidos (federais)",
    none: "Nenhum",
    notePL: "",
    noteUS:
      "Feriados federais dos EUA, incluindo datas de observância. Não inclui feriados estaduais.",
    noteBR:
      "Brasil: feriados nacionais e Sexta-feira Santa. Não inclui feriados locais nem pontos facultativos (Carnaval, Corpus Christi).",
    notenone: "Feriados ocultos.",
    navigation: "Navegação por semanas",
    selected: "Semana selecionada",
    observed: "data de observância",
  },
};
const t = (k) => translations[locale][k];
function translatePage() {
  $("theme").setAttribute("aria-label", t("appearance"));
  for (const option of $("theme").options) option.textContent = t(option.value);
  document.querySelector(".page-menu").setAttribute("aria-label", t("pages"));
  document.title =
    (/\/holidays(?:\.html)?\/?$/.test(location.pathname)
      ? t("holidayPage") + " 2026–2035"
      : t("heading")) + " | calendar-week";
  document.documentElement.lang = locale;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $("current").textContent = t("thisWeek");
  for (const [id, k] of [
    ["prev", "previous"],
    ["next", "next"],
    ["week-system", "weeks"],
    ["country", "holidays"],
    ["locale", "language"],
    ["year", "year"],
  ])
    $(id).setAttribute("aria-label", t(k));
  document
    .querySelector('nav[aria-label="Week navigation"], nav.week-navigation')
    ?.setAttribute("aria-label", t("navigation"));
  document
    .querySelector(".week-panel")
    .setAttribute("aria-label", t("selected"));
  for (const opt of $("country").options) opt.textContent = t(opt.value);
  for (const opt of $("week-system").options) opt.textContent = t(opt.value);
}
const holidayNames = [
  ["New Year's Day", "Nowy Rok", "Ano-Novo"],
  ["Epiphany", "Święto Trzech Króli", "Dia de Reis"],
  ["Labour Day", "Święto Pracy", "Dia do Trabalho"],
  ["Constitution Day", "Święto Konstytucji 3 Maja", "Dia da Constituição"],
  [
    "Assumption of Mary",
    "Wniebowzięcie Najświętszej Maryi Panny",
    "Assunção de Nossa Senhora",
  ],
  ["All Saints’ Day", "Wszystkich Świętych", "Dia de Todos os Santos"],
  ["Independence Day", "Święto Niepodległości", "Dia da Independência"],
  ["Christmas Day", "Boże Narodzenie", "Natal"],
  [
    "Second day of Christmas",
    "Drugi dzień Bożego Narodzenia",
    "Segundo dia de Natal",
  ],
  ["Christmas Eve", "Wigilia", "Véspera de Natal"],
  ["Easter Sunday", "Wielkanoc", "Domingo de Páscoa"],
  ["Easter Monday", "Poniedziałek Wielkanocny", "Segunda-feira de Páscoa"],
  ["Pentecost", "Zesłanie Ducha Świętego", "Pentecostes"],
  ["Corpus Christi", "Boże Ciało", "Corpus Christi"],
  [
    "Juneteenth National Independence Day",
    "Juneteenth – Dzień Wyzwolenia",
    "Juneteenth – Dia da Emancipação",
  ],
  ["Veterans Day", "Dzień Weteranów", "Dia dos Veteranos"],
  [
    "Martin Luther King Jr. Day",
    "Dzień Martina Luthera Kinga",
    "Dia de Martin Luther King Jr.",
  ],
  [
    "Washington’s Birthday",
    "Urodziny Waszyngtona",
    "Aniversário de Washington",
  ],
  ["Labor Day", "Święto Pracy", "Dia do Trabalho"],
  ["Columbus Day", "Dzień Kolumba", "Dia de Colombo"],
  ["Thanksgiving Day", "Święto Dziękczynienia", "Dia de Ação de Graças"],
  ["Memorial Day", "Dzień Pamięci", "Dia da Memória"],
  ["Confraternização Universal", "Nowy Rok", "Confraternização Universal"],
  ["Tiradentes", "Tiradentes", "Tiradentes"],
  ["Dia do Trabalho", "Święto Pracy", "Dia do Trabalho"],
  [
    "Independência do Brasil",
    "Niepodległość Brazylii",
    "Independência do Brasil",
  ],
  [
    "Nossa Senhora Aparecida",
    "Matki Bożej z Aparecidy",
    "Nossa Senhora Aparecida",
  ],
  ["Finados", "Dzień Zaduszny", "Finados"],
  [
    "Proclamação da República",
    "Proklamacja Republiki",
    "Proclamação da República",
  ],
  [
    "Dia da Consciência Negra",
    "Dzień Świadomości Czarnych",
    "Dia da Consciência Negra",
  ],
  ["Natal", "Boże Narodzenie", "Natal"],
  ["Paixão de Cristo", "Wielki Piątek", "Paixão de Cristo"],
];
const brazilEnglish = {
  "Confraternização Universal": "New Year's Day",
  Tiradentes: "Tiradentes Day",
  "Dia do Trabalho": "Labour Day",
  "Independência do Brasil": "Brazilian Independence Day",
  "Nossa Senhora Aparecida": "Our Lady of Aparecida",
  Finados: "All Souls’ Day",
  "Proclamação da República": "Republic Proclamation Day",
  "Dia da Consciência Negra": "Black Awareness Day",
  Natal: "Christmas Day",
  "Paixão de Cristo": "Good Friday",
};
function translateHoliday(name) {
  const observed = name.endsWith(" (observed)"),
    base = name.replace(" (observed)", ""),
    row = holidayNames.find((r) => r[0] === base),
    translated =
      locale === "en-GB"
        ? brazilEnglish[base] || base
        : row?.[locale === "pl-PL" ? 1 : 2] || base;
  return translated + (observed ? " (" + t("observed") + ")" : "");
}
const fmt = (d, options) => new Intl.DateTimeFormat(locale, options).format(d);
function render() {
  translatePage();
  const now = new Date(),
    today = day(now),
    end = add(start, 6),
    next = add(start, 7),
    i = weekInfo(start),
    current = weekStart(today).getTime() === start.getTime();
  $("week").textContent = String(i.week).padStart(2, "0");
  $("iso").textContent =
    `${weekSystem === "iso" ? "ISO" : "US"} · ${t("week")} ${i.year}`;
  $("range").textContent =
    `${fmt(start, { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short", year: "numeric" })}`;
  $("status").textContent = current
    ? t("current")
    : start < today
      ? t("past")
      : t("upcoming");
  $("calendar").replaceChildren();
  for (let n = 0; n < 7; n++) {
    const date = add(start, n),
      isToday = key(date) === key(today),
      el = document.createElement("div");
    el.className =
      "day" +
      (holiday(date) ? " holiday" : "") +
      ([0, 6].includes(date.getDay()) ? " weekend" : "") +
      (isToday ? " today" : "");
    if (isToday) el.setAttribute("aria-current", "date");
    const values = [
      ["day-name", fmt(date, { weekday: "long" })],
      ["date", date.getDate()],
      [
        "day-note",
        holiday(date)
          ? (isToday ? t("today") + " · " : "") + holiday(date)
          : isToday
            ? t("today")
            : "",
      ],
    ];
    for (const [cls, value] of values) {
      const child = document.createElement("div");
      child.className = cls;
      child.textContent = value;
      el.append(child);
    }
    $("calendar").append(el);
  }
  $("holiday-note").textContent = t("note" + country);
}
for (let y = 2026; y <= 2035; y++) {
  const option = document.createElement("option");
  option.value = y;
  option.textContent = y;
  $("year").append(option);
}
$("year").value = 2026;
function renderYear() {
  const year = Number($("year").value),
    container = $("months");
  container.replaceChildren();
  for (let m = 0; m < 12; m++) {
    const section = document.createElement("section");
    section.className = "month";
    const title = document.createElement("h3");
    title.textContent = fmt(new Date(year, m, 1), { month: "long" });
    section.append(title);
    const grid = document.createElement("div");
    grid.className = "month-grid";
    const offset = weekSystem === "iso" ? 1 : 0;
    for (let d = 0; d < 7; d++) {
      const label = document.createElement("span");
      label.textContent = fmt(new Date(2026, 5, 7 + d + offset), {
        weekday: "narrow",
      });
      grid.append(label);
    }
    const first = new Date(year, m, 1);
    for (let blank = 0; blank < (first.getDay() - offset + 7) % 7; blank++)
      grid.append(document.createElement("span"));
    const list = document.createElement("ul");
    list.className = "holiday-list";
    for (let d = 1; d <= new Date(year, m + 1, 0).getDate(); d++) {
      const date = new Date(year, m, d),
        name = holiday(date),
        button = document.createElement("button");
      button.textContent = d;
      button.className =
        (name ? "holiday-date " : "") +
        (key(date) === key(new Date()) ? "today-date" : "");
      button.title =
        fmt(date, { dateStyle: "full" }) + (name ? " · " + name : "");
      button.setAttribute("aria-label", button.title);
      button.onclick = () => {
        if (/\/holidays(?:\.html)?\/?$/.test(location.pathname)) {
          location.href = new URL(
            (location.pathname.endsWith("/") ? "../" : "./") +
              "?date=" +
              key(date),
            location.href,
          ).href;
          return;
        }
        start = weekStart(date);
        render();
        $("calendar").scrollIntoView({ behavior: "smooth", block: "center" });
      };
      grid.append(button);
      if (name) {
        const item = document.createElement("li");
        item.textContent = d + " · " + name;
        list.append(item);
      }
    }
    section.append(grid, list);
    container.append(section);
  }
}
$("year").onchange = renderYear;
const isHolidayPage = /\/holidays(?:\.html)?\/?$/.test(location.pathname);
$("year-calendar").hidden = !isHolidayPage;
document.querySelector(".intro").hidden = isHolidayPage;
document.querySelector(".week-panel").hidden = isHolidayPage;
document.querySelectorAll(".page-menu a").forEach((link) => {
  if (link.getAttribute("href").endsWith("holidays/") === isHolidayPage)
    link.setAttribute("aria-current", "page");
});
const dateParam = new URLSearchParams(location.search).get("date");
if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
  const [y, m, d] = dateParam.split("-").map(Number);
  const selected = new Date(y, m - 1, d);
  if (Number.isFinite(selected.getTime())) start = weekStart(selected);
}
$("theme").value = document.documentElement.dataset.theme || "light";
$("theme").onchange = () => {
  const theme = $("theme").value;
  document.documentElement.dataset.theme = theme;
  document.cookie = `calendar-theme=${theme}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
};
$("prev").onclick = () => {
  start = add(start, -7);
  render();
};
$("next").onclick = () => {
  start = add(start, 7);
  render();
};
$("current").onclick = () => {
  start = weekStart(new Date());
  render();
};
$("locale").onchange = () => {
  locale = $("locale").value;
  savePreference("weekday-locale", locale);
  render();
  renderYear();
};
$("country").onchange = () => {
  country = $("country").value;
  savePreference("weekday-country", country);
  render();
  renderYear();
};
$("week-system").onchange = () => {
  weekSystem = $("week-system").value;
  start = weekStart(new Date());
  savePreference("weekday-system", weekSystem);
  render();
  renderYear();
};
render();
renderYear();
setInterval(render, 30000);

// Browsers may restore form controls after the initial script, including on Back.
// Reapply saved preferences to both controls and calendar after that restoration.
window.addEventListener("pageshow", () => {
  const previousSystem = weekSystem;
  weekSystem = loadPreference("weekday-system", ["iso", "us"], "iso");
  locale = loadPreference(
    "weekday-locale",
    ["en-GB", "pl-PL", "pt-BR"],
    "en-GB",
  );
  country = loadPreference("weekday-country", ["PL", "US", "BR", "none"], "PL");
  const theme = loadPreference("calendar-theme", ["light", "dark"], "light");
  $("week-system").value = weekSystem;
  $("locale").value = locale;
  $("country").value = country;
  $("theme").value = theme;
  document.documentElement.dataset.theme = theme;
  if (weekSystem !== previousSystem) start = weekStart(new Date());
  render();
  renderYear();
});
