# DScroll — White-Label TLD dApp

A fully white-label, production-ready Web3 dApp for managing and minting sub-names under any Top-Level Domain (TLD) on the blockchain. Powered by the [ODude SDK](https://www.npmjs.com/package/@odude/odude-sdk), this app gives TLD owners **complete control** over their namespace — branding, pricing, chains, airdrop, and metadata.

> Built for operators who want to deploy their own branded domain experience without writing a single line of smart contract code.

---

## 🚀 Features

| Feature | Description |
|---|---|
| **Sub-name Minting** | Let users mint `name@yourTLD` directly from your branded frontend |
| **TLD Management** | Update pricing, sync ownership, and configure contract settings |
| **Token URI Control** | Set and verify on-chain metadata (NFT image, description, attributes) |
| **Airdrop Management** | Create and manage airdrops; withdraw unclaimed funds |
| **Whois Lookup** | Search and verify registration details for any name |
| **Multi-Chain Support** | Base Sepolia, Polygon, Ethereum, Filecoin, BNB Chain |
| **White-Label Ready** | Single config file controls branding, TLDs, chains, and UI labels |

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16+](https://nextjs.org/) (App Router)
- **UI**: [Chakra UI v2](https://chakra-ui.com/) + [Framer Motion](https://www.framer.com/motion/)
- **Web3**:
  - [RainbowKit](https://www.rainbowkit.com/) — Wallet connection UI
  - [Wagmi](https://wagmi.sh/) + [Viem](https://viem.sh/) — Blockchain interaction
  - [ODude SDK](https://www.npmjs.com/package/@odude/odude-sdk) — TLD protocol layer
- **Language**: TypeScript

---

## ⚙️ White-Label Configuration

All branding and TLD configuration lives in a **single JSON file**:

### `src/config/config.json`

This is the primary file you need to customize for your deployment.

```json
{
  "site_configuration": {
    "site_name": "Your Brand Name",
    "site_slogan": "Your Gateway to the Decentralized Web",
    "logo": "/logo.png",
    "chain_id": 84532,
    "chain_name": "Base Sepolia",
    "explorer_url": "https://sepolia.basescan.org",
    "rpc_url": "https://sepolia.base.org"
  },
  "ui_labels": {
    "search_placeholder": "Search for a domain...",
    "search_button": "Check Availability",
    "mint_button": "Mint Domain",
    "manage_button": "Manage Assets",
    "transfer_button": "Transfer Domain",
    "list_name_label": "Domain Listing"
  },
  "domains": [
    {
      "tld": "yourtld",
      "title": "Your TLD Digital ID",
      "description": "Description of your TLD namespace.",
      "nft_image": "/nft_yourtld.jpg",
      "external_url": "https://yourdomain.com",
      "cost": "0.001",
      "erc20_addr": "",
      "erc20_name": "",
      "decimals": 0
    }
  ],
  "menu": [
    { "title": "Home", "link": "/" },
    { "title": "Dashboard", "link": "/dashboard" }
  ],
  "social_media": [
    { "title": "Twitter", "link": "https://twitter.com/yourhandle" },
    { "title": "Discord", "link": "https://discord.gg/yourlink" }
  ]
}
```

**Key fields:**

| Field | Description |
|---|---|
| `site_configuration.chain_id` | Chain ID for your TLD's deployment (e.g. `84532` for Base Sepolia) |
| `domains[].tld` | The TLD slug (e.g. `apple`, `india`) — must match on-chain registry |
| `domains[].cost` | Minting price in native token (ETH/MATIC etc.) |
| `domains[].erc20_addr` | Set to ERC-20 contract address if payment is in a token; leave empty for native |
| `domains[].nft_image` | Path to the NFT image placed in `/public/` |

---

### `src/config/config.ts`

Controls app-level branding and supported chains for Wagmi/RainbowKit:

```typescript
export const CONFIG = {
  logo: "/logo.png",
  site_name: "Your Brand",
  site_description: "Your site description",
  navigation: [
    { label: "Home", href: "/" },
    { label: "My Names", href: "/dashboard" },
    { label: "Airdrop", href: "/airdrop" },
    { label: "Whois", href: "/whois" },
  ],
  theme: "dark",
  blockchain: {
    defaultChain: "base",
    supportedChains: ["base"] as const,
  },
};
```

> [!WARNING]
> **Single-Chain Mode Enforcement**
>
> This is a white-label application. While it supports multiple networks under the hood, the entire dApp deployment must operate on **exactly one single blockchain** at a time for all TLDs. Moving between multiple chains within the same running application instance is disabled by design.
>
> If you list more than one chain in the `blockchain.supportedChains` array in `src/config/config.ts`, the application will stop execution and redirect to the **Setup Wizard** with a block notice. Ensure that the `supportedChains` array contains **exactly one** chain (e.g., `["base"]`).

---

## 🏁 Getting Started

### Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** v9+
- A **WalletConnect Project ID** — get one free at [cloud.walletconnect.com](https://cloud.walletconnect.com/)
- An **RPC URL** for your target chain (Infura, Alchemy, or public RPC)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/dscroll-name.git
cd dscroll-name
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Then fill in the values (see the full reference below):

```env
# ─── Required ────────────────────────────────────────────────────────────────

# WalletConnect Project ID
# Get yours free at: https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# ─── RPC URLs (set the chains you support) ────────────────────────────────────

# Base Sepolia (testnet — recommended for development)
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# BNB Smart Chain
NEXT_PUBLIC_BNB_RPC_URL=https://bsc-dataseed1.binance.org

# Filecoin
NEXT_PUBLIC_FILECOIN_RPC_URL=https://api.node.glif.io

# ─── Optional ────────────────────────────────────────────────────────────────

# Alchemy API key — improves RPC reliability and adds ENS support
# Get one at: https://www.alchemy.com/
NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_api_key
```

> ⚠️ **Never commit your `.env` file.** It is already excluded by `.gitignore`.

---

### `.env` Variable Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ Yes | Enables the WalletConnect modal for mobile wallets |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | ✅ Yes (if using Base Sepolia) | RPC endpoint for Base Sepolia testnet |
| `NEXT_PUBLIC_BNB_RPC_URL` | If using BNB | RPC endpoint for BNB Smart Chain |
| `NEXT_PUBLIC_FILECOIN_RPC_URL` | If using Filecoin | RPC endpoint for Filecoin |
| `NEXT_PUBLIC_ALCHEMY_ID` | Optional | Alchemy API key for better performance |

> All `NEXT_PUBLIC_*` variables are exposed to the browser. Do **not** put private keys or secrets here.
>
> **Note for Supabase**: The `SUPABASE_SERVICE_ROLE_KEY` must **never** be prefixed with `NEXT_PUBLIC_` as it gives full admin access to your database.

---

## 🗄️ Supabase Setup (Off-Chain Records)

This app supports storing off-chain records (like Name and Email) linked to sub-names. This data is cryptographically verified via wallet signatures.

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com/) and create a new project.
2. Once the project is ready, go to **Project Settings -> API**.
3. Copy the `Project URL` and `anon` (public) key.
4. Copy the `service_role` (secret) key.

### 2. Configure Environment
Add the following to your `.env` file. Providing the `DATABASE_URL` enables **Automatic Table Creation**, so you don't need to run any SQL manually.

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Found in Project Settings -> Database -> Connection string -> URI
# IMPORTANT: For Vercel, select 'Pooler' -> Mode: 'Transaction' and use port 6543
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[PASSWORD]@[YOUR-REGION].pooler.supabase.com:6543/postgres?sslmode=require
```

### 3. Automatic Initialization
Once the `DATABASE_URL` is provided, the app will automatically create the `records` table and set up Row Level Security (RLS) policies the first time you attempt to save or view a record.

> [!TIP]
> If you prefer manual setup, you can still run the following SQL in the Supabase SQL Editor:

```sql
-- Create records table
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subname TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  name TEXT,
  email TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Set up RLS (Row Level Security)
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public profiles are viewable by everyone" ON records
  FOR SELECT USING (true);
```

---

### 4. Add Your Assets

Place your TLD NFT images in the `/public/` directory:

```
public/
├── logo.png          ← Your brand logo
├── nft_yourtld.jpg   ← NFT image for each TLD listed in config.json
└── favicon.ico
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Token URI / Metadata API

This app includes a built-in metadata API endpoint that serves NFT metadata for your TLD:

```
GET /api/{tld}?name={subname}
```

**Example:** `https://yourdeploy.vercel.app/api/apple?name=john`

When setting the Token URI on-chain via the TLD management dashboard, use:

```
https://yourdeploy.vercel.app/api/{tld}
```

The endpoint returns metadata conforming to the ERC-721 metadata standard:

```json
{
  "name": "john@apple",
  "description": "...",
  "image": "/nft_apple.jpg",
  "external_url": "https://yourdeploy.vercel.app",
  "attributes": [...]
}
```

---

## 📁 Project Structure

```
dscroll-name/
├── public/                   # Static assets (logo, NFT images)
├── src/
│   ├── app/
│   │   ├── page.tsx          # Home / minting page
│   │   ├── dashboard/        # "My Names" — user's minted sub-names
│   │   ├── airdrop/          # Claim airdrop page
│   │   ├── whois/            # Whois lookup
│   │   ├── manage/
│   │   │   └── subname/      # TLD owner management dashboard
│   │   │       └── [subname] # Dynamic route per sub-name
│   │   └── api/
│   │       └── [tld]/        # NFT metadata API (Token URI source)
│   ├── components/           # Reusable UI components
│   ├── config/
│   │   ├── config.json       # ← PRIMARY white-label config
│   │   ├── config.ts         # App-level config (chains, nav, theme)
│   │   └── theme.ts          # Chakra UI theme customization
│   ├── lib/                  # ODude SDK integration logic
│   ├── types/                # TypeScript type definitions
│   └── utils/
│       ├── web3.ts           # RainbowKit + Wagmi chain setup
│       └── transaction.ts    # Transaction execution utilities
├── .env                      # ← Your environment variables (not committed)
├── .env.example              # Template for environment variables
└── next.config.ts
```

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your repository to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add all your `.env` variables in **Project Settings → Environment Variables**
4. Deploy

After deployment, update the Token URI in the TLD management dashboard to point to your live URL.

---

## 🔑 TLD Management

Once deployed, TLD owners can access the management dashboard at:

```
/manage/subname/{your-subname}
```

From there you can:
- **Update pricing** for sub-name minting
- **Set Token URI** — link on-chain NFT metadata to your deployed `/api/{tld}` endpoint
- **Sync ownership** — update the registry if ownership has changed
- **Manage airdrops** — fund, monitor, and withdraw airdrop pools

---

## 📜 License

This project is licensed for white-label use under the ODude ecosystem.  
Smart contract infrastructure is provided by [ODude Protocol](https://www.npmjs.com/package/@odude/odude-sdk).
