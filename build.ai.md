# Guide for AI Agents

## 1️⃣ Project Overview
This is a **Next.js-based Web3 dApp** with a configurable UI and integrated Web3 tools. The project should:
- Use **Next.js** for SSR and optimized performance.
- Include **Wagmi** and **RainbowKit** for wallet connection.
- Be styled using **Chakra UI**.
- Pull UI elements from a common **config.ts** file.

---

## 2️⃣ Install Dependencies
The project should install the following packages:

```sh
npm install next react react-dom typescript @chakra-ui/react @emotion/react @emotion/styled framer-motion wagmi @rainbow-me/rainbowkit
```

---

## 3️⃣ Project Structure
The project should have the following files:

```
/odude-boilerplate
│── pages/
│   ├── index.tsx  # Main page
│   ├── _app.tsx   # Chakra UI provider
│── components/
│   ├── Header.tsx  # Includes Logo, Navigation, Wallet Connect
│   ├── Footer.tsx  # Configurable footer
│── config/
│   ├── config.ts  # Stores UI & Web3 settings
│── styles/
│   ├── global.css  # Global styles
│── utils/
│   ├── web3.ts  # Handles Web3 interactions
│── public/
│   ├── logo.png  # Default logo
```

---

## 4️⃣ UI Configuration (config.ts)
All UI elements should be **configurable** via `config.ts`:

```ts
export const CONFIG = {
  logo: "/logo.png",
  site_name: "DScroll TLD",
  site_description: "Manage your Web3 TLDs in one place",
  navigation: ["Home", "Dashboard"],
  theme: "light", // light or dark mode
  background: "#f4f4f4", // Background color
  footer: {
    text: "Powered by ODude",
    socialLinks: {
      twitter: "https://twitter.com/odude",
      github: "https://github.com/odude",
    },
  },
  blockchain: {
    defaultChain: "basesepolia",
    supportedChains: ["polygon", "ethereum", "baseseplia", "filecoin", "BNB"],
  },
};
```

---

## 5️⃣ Features to Implement
### UI & Layout
✅ **Header** (Logo, Navigation, Wallet Connect Button)  
✅ **Main Content** (Large white container for future updates)  
✅ **Footer** (Links, blockchain info, social icons)  
✅ **Dark/Light Mode Toggle**  
✅ **All buttons and links should have hover effects**  
✅ **Mobile-friendly layout using Chakra UI**  

### Web3 Integration
✅ **Connect Wallet Button** (Using Wagmi + RainbowKit)  
✅ **Show Connected Wallet Address** (Shortened `0xaa...ea9f`)  
✅ **Multi-Chain Support** (Base Sepolia default, configurable in `config.ts`)  
✅ **Network Display & Switcher**  
✅ **Disconnect Button** (With power-off icon)  

### Performance & SEO
✅ **Server-side rendering (SSR) / Static Site Generation (SSG)**  
✅ **Meta tags & Open Graph settings (Configurable in `config.ts`)**  
✅ **SEO-friendly URL structure**  

---

## 6️⃣ Additional Notes
- The layout should be **professional & responsive**.
- Use **Chakra UI components** for styling.
- Ensure **all elements pull from `config.ts`**.
- Implement **best practices for Next.js performance**.

---
---

## Extra Notes for AI Agents

- When wallet network or address changed, it should update the state and re-render the page accordingly.
- if wallet disconnected, should ask for connect wallet again.
- if network connected other then supportedChains should show message and ask to switch to supportedChains and also provide a button to switch to supportedChains.
- At front page (home link in navigation) there will be some description of site, Open dApp button should open the dashboard page. 
- dark & light mode toggle should work. 
- Mobile responsive and looks good on mobile device.