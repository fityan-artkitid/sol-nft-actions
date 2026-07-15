Berikut adalah kode *markdown* lengkap yang siap kamu *copy-paste* langsung ke file `README.md` kamu.

*(Tips: Arahkan kursor ke pojok kanan atas blok kode di bawah ini, lalu klik tombol **Copy**)*

```markdown
# 🚀 Solana NFT Collection Generator

Repositori ini berisi skrip untuk membuat *collection* dan melakukan *minting* NFT di jaringan Solana. Ikuti panduan di bawah ini untuk memulai.

---

## 🔗 Link Penting

Sebelum memulai, pastikan kamu sudah memiliki *faucet* (saldo devnet/testnet) yang cukup untuk membayar *gas fee*:

* [Blueshift Perks (Generate Faucet)](https://learn.blueshift.gg/en/perks)
* [Solana Faucet](https://faucet.solana.com/)

---

## 🛠️ Alur & Cara Kerja (Workflow)

Ikuti langkah-langkah berikut secara berurutan untuk menjalankan projek:

### 1. Setup Wallet
Buat *keypair wallet* baru yang akan digunakan sebagai pendana (*payer*) untuk membayar *gas fee* dan biaya pembuatan NFT. Simpan file *keypair* tersebut di **root folder** projek dengan nama `ids.json`.

> ⚠️ **PENTING:** Jangan pernah menaruh `ids.json` ke dalam *public repository*. Pastikan file ini sudah terdaftar di `.gitignore` kamu.

### 2. Upload Metadata
Siapkan *file* gambar dan metadata NFT kamu, lalu unggah (*upload*) ke Arweave, IPFS, atau *storage blockchain* lainnya untuk mendapatkan URL metadatanya.

### 3. Membuat Collection
Jalankan skrip `index.ts` untuk membuat *Collection NFT* utama terlebih dahulu.
```bash
npx ts-node-esm index.ts

```

### 4. Minting NFT

* Salin **Public Key (Pubkey)** hasil dari pembuatan *collection* di langkah ke-3.
* Buka file `mint-nft.ts`, lalu masukkan *pubkey collection* tersebut ke bagian yang sesuai.
* Siapkan metadata JSON untuk NFT yang akan di-*mint* (pastikan sudah di-upload ke Arweave/storage).
* Jalankan skrip *minting*:

```bash
npx ts-node-esm mint-nft.ts

```

### 5. Inisialisasi Projek

Langkah terakhir, daftarkan projek kamu menggunakan skrip `init-project.ts`.

```bash
npx ts-node-esm init-project.ts

```

---

## 📄 Sampel JSON Metadata

Berikut adalah contoh format struktur JSON untuk *Collection* dan *NFT Individual* yang perlu disiapkan di *storage* (seperti Arweave):

### 📁 Metadata Collection

```json
{
  "name": "Snakehead Story by Bos Choko",
  "symbol": "BOSC",
  "description": "Bos Choko is a trusted seller specializing in premium Channa fish feed, committed to building the ultimate global Channa community. Hold exclusive Bos Choko NFTs to unlock premium community rewards, loyalty benefits, and real-world utility as part of our growing ecosystem.",
  "image": "[https://qtn26tsf2thtai5z6r22zakmzk5swb2dgwitdkoru7piffmjtxiq.turbo-gateway.com/hNuvTkXUzzAjufR1rIFMyrsrB0M1kTGp0afegpWJndE](https://qtn26tsf2thtai5z6r22zakmzk5swb2dgwitdkoru7piffmjtxiq.turbo-gateway.com/hNuvTkXUzzAjufR1rIFMyrsrB0M1kTGp0afegpWJndE)?",
  "external_url": "[https://artkit.io](https://artkit.io)",
  "attributes": []
}

```

### 🖼️ Metadata NFT Individual

```json
{
  "name": "Bos Choko #1",
  "symbol": "BOSC",
  "description": "Bos Choko is a trusted seller specializing in premium Channa fish feed, committed to building the ultimate global Channa community. Hold exclusive Bos Choko NFTs to unlock premium community rewards, loyalty benefits, and real-world utility as part of our growing ecosystem.",
  "image": "[https://turbo-gateway.com/6LJLG2WLo0FGPMfmtt_4u7vlJFL-M_b11_MPTH-O-ek](https://turbo-gateway.com/6LJLG2WLo0FGPMfmtt_4u7vlJFL-M_b11_MPTH-O-ek)",
  "external_url": "[https://artkit.io](https://artkit.io)",
  "attributes": [
    { "trait_type": "Class", "value": "Challenger" },
    { "trait_type": "Background", "value": "Clear Water Aquascape" },
    { "trait_type": "Species", "value": "Barca" },
    { "trait_type": "Mental", "value": "Normal" },
    { "trait_type": "Eye", "value": "Red Eye" },
    { "trait_type": "Fin Type", "value": "Semi-highfin" },
    { "trait_type": "Body Pattern", "value": "Sparse Dots" },
    { "trait_type": "Bars", "value": "No Bar" },
    { "trait_type": "Base Fish Body", "value": "Normal" }
  ]
}

```

---

## 🧑‍💻 Author

Created and maintained with ❤️ by **Fityan Aula J**

```

```