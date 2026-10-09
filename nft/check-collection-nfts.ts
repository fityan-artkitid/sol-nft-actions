// execute: npx ts-node-esm nft/check-collection-nfts.ts
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchAssetsByCollection, fetchCollection, mplCore } from "@metaplex-foundation/mpl-core";
import type { PluginAuthority } from "@metaplex-foundation/mpl-core";
import { publicKey } from "@metaplex-foundation/umi";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Helper function untuk mem-parse PluginAuthority secara Type-Safe
function parsePluginAuthority(authority: PluginAuthority): string {
  if (authority.type === "Address" && authority.address) {
    return authority.address.toString();
  }
  if (authority.type === "Owner") {
    return "Owner (Self)";
  }
  if (authority.type === "UpdateAuthority") {
    return "Update Authority";
  }
  return JSON.stringify(authority);
}

async function checkCollectionNfts() {
  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";
  const umi = createUmi(RPC_ENDPOINT).use(mplCore());

  // Parameter Utama: Collection Address On-Chain
  const collectionAddress = publicKey("7eQSjN4z4HGMB34VtGhqTnfTxmhUhKW134fAXoq6Ux28");

  try {
    console.log(`🔍 Menghubungi Solana Network...\n`);
    
    // 1. Fetch Informasi Koleksi
    let collectionName = "Unknown Collection";
    try {
      const collectionData = await fetchCollection(umi, collectionAddress);
      collectionName = collectionData.name;
    } catch {
      console.warn("⚠️ Gagal mengambil nama koleksi, menggunakan ID address.");
    }

    console.log("=======================================================");
    console.log(`🖼️  KOLEKSI           : ${collectionName}`);
    console.log(`🔑 Collection Address : ${collectionAddress.toString()}`);
    console.log("=======================================================");
    console.log("⏳ Menarik semua daftar NFT di bawah koleksi ini...\n");

    // 2. Fetch Semua Asset yang terikat ke Collection ini
    const assets = await fetchAssetsByCollection(umi, collectionAddress);

    if (assets.length === 0) {
      console.log("ℹ️ Tidak ada NFT yang ditemukan di bawah koleksi ini.");
      return;
    }

    console.log(`📊 Total NFT Ditemukan: ${assets.length} Aset\n`);

    // ANSI Escape Code Warna Terminal
    const PINK = "\x1b[95m";
    const RESET = "\x1b[0m";

    // 3. Iterasi dan Tampilkan Detail Setiap NFT
    assets.forEach((asset, index) => {
      let isFrozen = false;
      let freezeAuthority = "N/A";

      if (asset.freezeDelegate) {
        isFrozen = asset.freezeDelegate.frozen;
        freezeAuthority = parsePluginAuthority(asset.freezeDelegate.authority);
      }

      // Format Status: Merah Muda + Gembok (LOCKED) / Teks Biasa Tanpa Gembok (UNLOCKED)
      const statusText = isFrozen
        ? `${PINK}🔒 TER-FREEZE (LOCKED)${RESET}`
        : "TIDAK TER-FREEZE (UNLOCKED)";

      console.log(`[${index + 1}/${assets.length}] 🏷️  Judul NFT : ${asset.name}`);
      console.log(`      🆔 Address/ID : ${asset.publicKey.toString()}`);
      console.log(`      👑 Owner      : ${asset.owner.toString()}`);
      console.log(`      ❄️  Status     : ${statusText}`);
      if (isFrozen || asset.freezeDelegate) {
        console.log(`      🛡️  Freeze Auth: ${freezeAuthority}`);
      }
      console.log(`-------------------------------------------------------`);
    });

  } catch (error) {
    console.error("❌ Gagal menarik daftar NFT dari koleksi:", error);
  }
}

checkCollectionNfts();