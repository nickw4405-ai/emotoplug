# ⚡ EBike Mod Finder

Snap a photo of your ebike → Claude AI identifies the exact make & model → finds the best upgrades at the cheapest legit prices.

## How it works

1. **Photo** — upload or take a live camera shot of your ebike
2. **Identify** — Claude vision reads the brand, model, motor type, battery location
3. **Mods** — Claude recommends the top 8 most popular upgrades for *that specific bike*
4. **Price hunt** — generates Amazon, eBay, Google Shopping, and Walmart links so you can instantly compare and find the cheapest option
5. **Legit check** — every result is scored 1–10 for trustworthiness (known retailers score highest)

## Setup

### 1. Install dependencies

```bash
cd ebike-mods-finder
pip install -r requirements.txt
```

### 2. Add your API keys

```bash
cp .env.example .env
# Edit .env and paste your keys
```

- **ANTHROPIC_API_KEY** (required) — from https://console.anthropic.com/
- **BRAVE_API_KEY** (optional, free tier) — from https://brave.com/search/api/
  - Without it: Claude uses training knowledge to suggest mods + shopping links
  - With it: also searches the live web for real product pages and prices

### 3. Run

```bash
python app.py
```

Open http://localhost:5000

## Features

- 📸 Drag & drop, file upload, or live camera
- 🤖 Claude AI vision for accurate ebike identification
- 🔋 Mod categories: battery, motor, lighting, comfort, safety, performance, storage, display
- 💰 Price range estimates + direct shopping links (Amazon, eBay, Google Shopping, Walmart)
- ✅ Legitimacy scoring — trusted retailers flagged green, unknown sources flagged red
- 🔍 Filter by category, sort by price or legitimacy
- 📱 Mobile responsive
