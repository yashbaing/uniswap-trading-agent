const path = require("path");
const PptxGenJS = require("pptxgenjs");

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Yash";
pptx.company = "Uniswap Trading Agent";
pptx.subject = "Dynamic Uniswap Trading Agent";
pptx.title = "Uniswap Trading Agent - Complete Explained PPT";
pptx.lang = "en-US";

const COLORS = {
  bg: "0B1020",
  panel: "141B34",
  text: "EAF0FF",
  muted: "9DB1D7",
  accent: "6FA8FF",
  success: "4EE39C",
  warn: "FFD166",
};

function addTitleSlide(title, subtitle) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.bg };
  s.addText(title, {
    x: 0.6,
    y: 1.2,
    w: 12,
    h: 1,
    fontFace: "Aptos Display",
    fontSize: 38,
    bold: true,
    color: COLORS.text,
  });
  s.addText(subtitle, {
    x: 0.6,
    y: 2.4,
    w: 12.2,
    h: 1,
    fontFace: "Aptos",
    fontSize: 19,
    color: COLORS.muted,
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y: 3.4,
    w: 6.8,
    h: 1.1,
    fill: { color: COLORS.panel },
    line: { color: COLORS.accent, pt: 1.2 },
    radius: 0.12,
  });
  s.addText("Built with Node.js + Uniswap Trade API + Local Dashboard", {
    x: 0.82,
    y: 3.73,
    w: 6.2,
    h: 0.5,
    fontFace: "Aptos",
    fontSize: 14,
    color: COLORS.text,
  });
}

function addContentSlide(title, bullets, note) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.bg };
  s.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 12.5,
    h: 0.6,
    fontFace: "Aptos Display",
    fontSize: 28,
    bold: true,
    color: COLORS.text,
  });
  s.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 0.95,
    w: 12.3,
    h: 0,
    line: { color: COLORS.accent, pt: 1.5 },
  });
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    h: 5.35,
    fill: { color: COLORS.panel, transparency: 5 },
    line: { color: "223664", pt: 1.0 },
    radius: 0.08,
  });
  s.addText(
    bullets.map((b) => ({ text: b, options: { bullet: { indent: 18 } } })),
    {
      x: 0.9,
      y: 1.55,
      w: 11.3,
      h: 4.8,
      fontFace: "Aptos",
      fontSize: 17,
      color: COLORS.text,
      paraSpaceAfterPt: 10,
      breakLine: true,
    }
  );
  if (note) {
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 6.15,
      w: 11.7,
      h: 0.7,
      fill: { color: "10213F" },
      line: { color: COLORS.accent, pt: 1 },
      radius: 0.06,
    });
    s.addText(`Note: ${note}`, {
      x: 1.0,
      y: 6.35,
      w: 11.2,
      h: 0.35,
      fontFace: "Aptos",
      fontSize: 12,
      color: COLORS.muted,
    });
  }
}

addTitleSlide(
  "Uniswap Trading Agent",
  "Complete Explained Presentation (Architecture, Setup, Flow, Usage, Safety)"
);

addContentSlide(
  "1) Project Overview",
  [
    "A dynamic local trading agent that integrates with Uniswap Trade API.",
    "Provides REST endpoints for Quote, Trade, and DCA strategy execution.",
    "Includes a browser dashboard so trading can be managed without manual cURL calls.",
    "Uses wallet signing to broadcast real on-chain transactions.",
  ],
  "App runs in limited mode until both RPC_URL and WALLET_PRIVATE_KEY are configured."
);

addContentSlide(
  "2) Core Features Implemented",
  [
    "Quote endpoint: fetches swap quotes using token pair, amount, chain, and slippage.",
    "Trade endpoint: executes approvals (if required) and then submits the swap transaction.",
    "DCA strategy endpoint: runs repeated trades with configurable interval and run count.",
    "Human amount support: amountHuman is auto-converted to raw units using token decimals.",
    "Multi-chain presets: mainnet, base, and arbitrum.",
  ],
  "All features are available from API and dashboard UI."
);

addContentSlide(
  "3) Tech Stack and Project Structure",
  [
    "Backend: Node.js, Express, Axios, Ethers, Zod, Dotenv.",
    "UI: static HTML/CSS/JS served from Express public directory.",
    "Configuration: .env for API key, RPC URL, wallet key, and chain preset.",
    "Main files: src/server.js, public/index.html, README.md, .env.example.",
  ],
  "Simple structure keeps deployment and maintenance easy."
);

addContentSlide(
  "4) Request and Execution Flow",
  [
    "User submits input from dashboard (token in/out, amount, chain, slippage).",
    "Server validates payload via Zod schemas.",
    "Server calls Uniswap /quote endpoint with swap parameters.",
    "For trade: server calls /swap endpoint, executes approval tx(s), then executes swap tx.",
    "Server waits for confirmations and returns transaction hash + receipt.",
  ],
  "This ensures execution data is visible immediately in API response."
);

addContentSlide(
  "5) Dashboard Walkthrough",
  [
    "Single page at http://localhost:3000 with input controls and action buttons.",
    "Buttons include Check Health, Get Quote, Execute Trade, and Run DCA Strategy.",
    "Response panel displays complete JSON output (success/error details).",
    "Useful for fast local testing before production automation.",
  ],
  "Dashboard currently calls local backend directly."
);

addContentSlide(
  "6) Environment Configuration",
  [
    "UNISWAP_API_KEY: required for Trade API authentication.",
    "UNISWAP_API_BASE_URL: defaults to official Uniswap trade gateway.",
    "RPC_URL: Ethereum-compatible JSON-RPC endpoint for reads and writes.",
    "WALLET_PRIVATE_KEY: signer wallet for approvals/swaps (keep private).",
    "CHAIN_PRESET: default chain (mainnet/base/arbitrum).",
  ],
  "Never commit real secrets to GitHub."
);

addContentSlide(
  "7) Safety, Security, and Risk Controls",
  [
    "Real funds are used when wallet key is configured.",
    "Start with very small trade amounts in early testing.",
    "Use dedicated wallet for bot operations; avoid primary holdings wallet.",
    "Monitor slippage and gas costs to reduce execution risk.",
    "Implement spending limits, allowlists, and logging before production.",
  ],
  "Trading automation should always include guardrails."
);

addContentSlide(
  "8) Current Status (Local + GitHub)",
  [
    "Project runs locally and dashboard endpoint is live.",
    "Health endpoint confirms app status and mode.",
    "Repository has been pushed to GitHub main branch.",
    "Limited mode remains active until WALLET_PRIVATE_KEY is set.",
  ],
  "Once wallet key is added, Trade and DCA become fully live."
);

addContentSlide(
  "9) Demo Commands",
  [
    "Run server: npm start",
    "Open dashboard: http://localhost:3000",
    "Health check: GET /health",
    "Quote call: POST /quote",
    "Trade execution: POST /trade",
    "DCA strategy: POST /strategy/dca",
  ],
  "Use dashboard first, then automate with scripts."
);

addContentSlide(
  "10) Next Enhancements",
  [
    "Add persistent trade history in SQLite/PostgreSQL.",
    "Add PnL tracking and position analytics panel.",
    "Add stop-loss / take-profit strategy engine.",
    "Add webhook/Telegram alerts for executed swaps.",
    "Add CI checks and production deployment pipeline.",
  ],
  "These are the most impactful upgrades for reliability and scale."
);

const outputPath = path.join(process.cwd(), "Uniswap-Trading-Agent-Complete-Explained.pptx");
pptx
  .writeFile({ fileName: outputPath })
  .then(() => {
    console.log(`PPT generated: ${outputPath}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
