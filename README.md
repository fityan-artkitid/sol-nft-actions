# 🚀 Solana NFT Collection Generator

A simple toolkit for creating NFT Collections and minting NFTs on the Solana blockchain using Metaplex Core.

---

## ✨ Features

- Create NFT Collection
- Mint NFTs into an existing Collection
- Initialize project configuration
- Compatible with Metaplex Core

---

## 📋 Prerequisites

Before getting started, make sure you have:

- Node.js (v18 or later recommended)
- A Solana wallet keypair
- Devnet SOL for transaction fees

You can get free Devnet SOL from:

- 🔹 https://learn.blueshift.gg/en/perks
- 🔹 https://faucet.solana.com/

---

# 🛠 Workflow

Follow these steps in order.

## 1. Create a Wallet

Generate a new Solana keypair that will act as the payer for all transactions.

Save your keypair as:

```
ids.json
```

inside the project root.

> ⚠️ **Important**
>
> Never commit `ids.json` to GitHub.
> Make sure it is included in your `.gitignore`.

---

## 2. Upload Your NFT Metadata

Before minting, upload your assets to decentralized storage such as:

- Arweave
- IPFS
- Other permanent storage providers

Prepare:

- NFT image
- Collection image
- Metadata JSON

After uploading, copy the metadata URLs.

---

## 3. Create the NFT Collection

Run:

```bash
npx ts-node-esm index.ts
```

After the script finishes, save the generated **Collection Public Key**.

You'll need it in the next step.

---

## 4. Mint NFTs

Open:

```
mint-nft.ts
```

Update the following values:

- Collection Public Key
- Metadata URI

Then run:

```bash
npx ts-node-esm mint-nft.ts
```

Repeat this step for each NFT you want to mint.

---

## 5. Initialize the Project

Finally, register your project by running:

```bash
npx ts-node-esm init-project.ts
```

Your project is now ready.

---

# 📄 Metadata Examples

## Collection Metadata

```json
{
  "name": "Snakehead Story by Bos Choko",
  "symbol": "BOSC",
  "description": "Bos Choko is a trusted seller specializing in premium Channa fish feed, committed to building the ultimate global Channa community. Hold exclusive Bos Choko NFTs to unlock premium community rewards, loyalty benefits, and real-world utility as part of our growing ecosystem.",
  "image": "https://YOUR_COLLECTION_IMAGE_URL",
  "external_url": "https://artkit.io",
  "attributes": []
}
```

---

## NFT Metadata

```json
{
  "name": "Bos Choko #1",
  "symbol": "BOSC",
  "description": "Bos Choko is a trusted seller specializing in premium Channa fish feed, committed to building the ultimate global Channa community. Hold exclusive Bos Choko NFTs to unlock premium community rewards, loyalty benefits, and real-world utility as part of our growing ecosystem.",
  "image": "https://YOUR_NFT_IMAGE_URL",
  "external_url": "https://artkit.io",
  "attributes": [
    {
      "trait_type": "Class",
      "value": "Challenger"
    },
    {
      "trait_type": "Background",
      "value": "Clear Water Aquascape"
    },
    {
      "trait_type": "Species",
      "value": "Barca"
    },
    {
      "trait_type": "Mental",
      "value": "Normal"
    },
    {
      "trait_type": "Eye",
      "value": "Red Eye"
    },
    {
      "trait_type": "Fin Type",
      "value": "Semi-highfin"
    },
    {
      "trait_type": "Body Pattern",
      "value": "Sparse Dots"
    },
    {
      "trait_type": "Bars",
      "value": "No Bar"
    },
    {
      "trait_type": "Base Fish Body",
      "value": "Normal"
    }
  ]
}
```

---

# 📁 Project Structure

```
.
├── index.ts              # Create NFT Collection
├── mint-nft.ts           # Mint NFT into Collection
├── init-project.ts       # Initialize project
├── ids.json              # Wallet keypair (DO NOT COMMIT)
└── README.md
```

---

# ⚠️ Security

Never expose or commit:

- `ids.json`
- Private Keys
- Secret Recovery Phrases

Always add them to your `.gitignore`.

Example:

```gitignore
ids.json
.env
```

---

# ❤️ Author

Created and maintained by **Fityan Aula J**

If this project helps you, feel free to ⭐ the repository.
