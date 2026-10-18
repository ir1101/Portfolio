// All copy and data for the site. Ported from the previous single-file portfolio.
// Edit here — components only render what's in this file.

export const site = {
  name: "Ishu Raj",
  email: "ishu.raj1112005@gmail.com",
  coords: "N 23.34° E 85.30°",
  place: "Ranchi · IN",
  year: 2026,
};

export const heroMeta: { k: string; v: [string, string] }[] = [
  { k: "Based", v: ["Ranchi, Jharkhand", "India · UTC+5:30"] },
  { k: "Studying at", v: ["Vellore Institute", "of Technology, IN"] },
  { k: "Focus", v: ["Predictive models,", "feature engineering, viz"] },
  { k: "Status", v: ["Open to internships", "Summer ’26"] },
];

/** Segments of the about paragraph; `em: true` renders at full brightness. */
export const aboutLead: { t: string; em?: boolean }[] = [
  { t: "A " },
  { t: "CSE (Data Science)", em: true },
  { t: " student at VIT Vellore — class of ’28 — writing this from " },
  { t: "Ranchi", em: true },
  {
    t: ", somewhere between a textbook and a Jupyter notebook. I’m interested in the seam where statistics, code and a domain you actually care about meet — sport, cars, monsoons, anything with structure to find. I prefer models I can ",
  },
  { t: "explain", em: true },
  { t: " over models that merely score; I prefer notebooks that read like a story." },
];

export const statement = ["Models", "I can", "explain"];

export const facts: { k: string; v: string }[] = [
  { k: "Based", v: "Ranchi, IN" },
  { k: "Studying at", v: "VIT Vellore" },
  { k: "Degree", v: "B.Tech · CSE (DS) · ’28" },
  { k: "Stack", v: "Python, SQL, PyTorch" },
  { k: "Reading", v: "Causal Inference: The Mixtape" },
  { k: "Hours / wk", v: "≈ 38" },
  { k: "Coffee", v: "Filter, no sugar" },
];

export type Viz = "cricket" | "auto" | "lab";

export type Featured = {
  idx: string;
  name: string;
  tag: string;
  desc: string;
  stack: string[];
  specs: { k: string; v: string }[];
  viz: Viz;
  caption: [string, string, string];
};

export const featured: Featured[] = [
  {
    idx: "W/01",
    name: "Cricket Oracle",
    tag: "Sport analytics · 2025",
    desc: "A match-outcome predictor for limited-overs cricket. Ingests ball-by-ball data, engineers innings-state features (run rate trajectory, wickets-in-hand, venue priors), and blends a logistic baseline with a gradient-boosted model. Calibrated probabilities power a chase-difficulty heatmap that updates live ball-by-ball.",
    stack: ["Python", "Pandas", "XGBoost", "Streamlit"],
    specs: [
      { k: "Accuracy", v: "78.4%" },
      { k: "Matches", v: "12.1K" },
      { k: "Features", v: "47" },
    ],
    viz: "cricket",
    caption: ["Win probability · Inn. 2", "Over 0 → 50", "P(win) = 0.61"],
  },
  {
    idx: "W/02",
    name: "AutoQuote",
    tag: "Pricing model · 2025",
    desc: "A used-car price estimator trained on 50k+ listings scraped from Indian classifieds. Handles messy categoricals with target encoding, captures non-linear depreciation curves via gradient boosting, and surfaces SHAP-style attributions so a buyer can see which features moved the quote — mileage, segment, or geography.",
    stack: ["Python", "LightGBM", "SHAP", "Plotly"],
    specs: [
      { k: "RMSE", v: "₹38K" },
      { k: "Rows", v: "52.6K" },
      { k: "R²", v: "0.91" },
    ],
    viz: "auto",
    caption: ["Price × mileage · n=52.6K", "0 km → 250K km", "R² = 0.91"],
  },
  {
    idx: "W/03",
    name: "Selected experiments",
    tag: "Notebooks & micro-projects",
    desc: "A rotating shelf of weekend builds — a churn classifier on telecom data, an LSTM that scribbles cricket commentary in the style of a chosen broadcaster, an EDA dashboard over a decade of monsoon rainfall, and a recommender that suggests what to read next from my own library.",
    stack: ["Jupyter", "PyTorch", "scikit-learn", "Tableau"],
    specs: [
      { k: "Notebooks", v: "14" },
      { k: "Repos", v: "9" },
      { k: "Coffee", v: "∞" },
    ],
    viz: "lab",
    caption: ["Field notes · 40 cells", "Weekend builds", "Ongoing"],
  },
];

export const workFilters = ["All", "Modeling", "Analysis", "Viz", "Experiments"] as const;
export type WorkFilter = (typeof workFilters)[number];

export type IndexItem = {
  title: string;
  excerpt: string;
  tags: Exclude<WorkFilter, "All">[];
  kind: string;
  /** Which featured slide this row opens. */
  slide: number;
  /** Optional repo / demo URL. When set, the row also shows an external link. */
  href?: string;
};

export const workIndex: IndexItem[] = [
  {
    title: "Cricket Oracle",
    excerpt: "Match-outcome predictor for limited-overs cricket — calibrated win probabilities that update ball-by-ball.",
    tags: ["Modeling", "Viz"],
    kind: "2025",
    slide: 0,
  },
  {
    title: "AutoQuote",
    excerpt: "Used-car price estimator trained on 52.6K classifieds listings, with SHAP-style attributions on every quote.",
    tags: ["Modeling", "Analysis"],
    kind: "2025",
    slide: 1,
  },
  {
    title: "Churn classifier",
    excerpt: "A churn classifier on telecom data.",
    tags: ["Experiments", "Modeling"],
    kind: "Lab",
    slide: 2,
  },
  {
    title: "Commentary LSTM",
    excerpt: "An LSTM that scribbles cricket commentary in the style of a chosen broadcaster.",
    tags: ["Experiments", "Modeling"],
    kind: "Lab",
    slide: 2,
  },
  {
    title: "Monsoon EDA",
    excerpt: "An EDA dashboard over a decade of monsoon rainfall.",
    tags: ["Experiments", "Analysis", "Viz"],
    kind: "Lab",
    slide: 2,
  },
  {
    title: "Reading recommender",
    excerpt: "A recommender that suggests what to read next from my own library.",
    tags: ["Experiments", "Modeling"],
    kind: "Lab",
    slide: 2,
  },
];

export const services: { n: string; t: string; d: string }[] = [
  { n: "S/01", t: "Data Analysis", d: "Exploratory and confirmatory analysis on messy real-world datasets. Cleaning, EDA, hypothesis testing, and reports you can actually hand to a stakeholder." },
  { n: "S/02", t: "Predictive Modeling", d: "Classification and regression for forecasting, scoring, and ranking — with honest evaluation, calibration, and an eye on which features matter and why." },
  { n: "S/03", t: "Feature Engineering", d: "Turning raw logs into signals. Time-windowed aggregations, target encodings, leakage audits, and the unglamorous work that quietly wins the leaderboard." },
  { n: "S/04", t: "Dashboards & Viz", d: "Streamlit, Plotly, and matplotlib that don’t look like Plotly. Built for people who skim — clear hierarchy, fast load, no chart-junk." },
];

export const steps: { n: string; t: string; d: string }[] = [
  { n: "01", t: "Frame", d: "Pin down the question. What decision does this enable? What does ‘good enough’ look like, and for whom?" },
  { n: "02", t: "Explore", d: "Get hands dirty with the data. Distributions, outliers, leakage, and the cheap baseline that beats half the fancy models." },
  { n: "03", t: "Model", d: "Iterate from a baseline. Calibrate. Audit residuals. Stop when more complexity stops paying for itself." },
  { n: "04", t: "Ship", d: "Wrap it in something usable — a notebook, a dashboard, a tiny app — and write the part everyone skips: the README." },
];

export const nowCards: { tag: string; title: string; body: string }[] = [
  { tag: "Building", title: "A real-time cricket dashboard", body: "Wrapping the Oracle model in a Streamlit app that streams ball-by-ball deltas from an open API." },
  { tag: "Learning", title: "Causal inference", body: "Working through ‘The Mixtape’ alongside Pearl’s primer — DAGs, IVs, diff-in-diff, and unlearning my reflex to reach for correlation." },
  { tag: "Reading", title: "ESL, slowly", body: "Hastie/Tibshirani/Friedman, with a notebook open. The good kind of hard." },
  { tag: "Listening", title: "Linear Digressions reruns", body: "Old episodes that age surprisingly well. Also way too much Aphex Twin while debugging." },
  { tag: "Sport", title: "Watching too much cricket", body: "For research. Mostly. Also for the third umpire’s UI which is, somehow, beautiful." },
];

export type Channel = { k: string; v: string; href: string; action: string };

// Channels with an empty href are hidden. Add your LinkedIn and Kaggle URLs to show them.
export const channels: Channel[] = [
  { k: "Email", v: site.email, href: `mailto:${site.email}`, action: "Write" },
  { k: "GitHub", v: "@ir1101", href: "https://github.com/ir1101", action: "Browse" },
  { k: "LinkedIn", v: "in/ishuraj", href: "", action: "Connect" },
  { k: "Kaggle", v: "@ishuraj", href: "", action: "View" },
];

export const footerInfo =
  "Ishu Raj studies data science at VIT Vellore and builds predictive models, feature pipelines and visualisations people can actually read.";

export const sections = [
  { id: "about", n: "01", label: "About" },
  { id: "work", n: "02", label: "Work" },
  { id: "capabilities", n: "03", label: "Capabilities" },
  { id: "now", n: "04", label: "Now" },
  { id: "contact", n: "05", label: "Contact" },
] as const;
