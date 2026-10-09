// execute: npx ts-node-esm nft/unfreeze-one.ts
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  updatePlugin,
  mplCore,
  fetchAsset,
} from "@metaplex-foundation/mpl-core";
import { keypairIdentity, publicKey } from "@metaplex-foundation/umi";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  getNftTitle();
  const RPC_ENDPOINT =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";
  const umi = createUmi(RPC_ENDPOINT).use(mplCore());

  // Load wallet authority (Freeze Authority)
  const walletSecretKey = JSON.parse(
    fs.readFileSync("./sol-boschoko.json", "utf-8"),
  );
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(
    new Uint8Array(walletSecretKey),
  );
  umi.use(keypairIdentity(walletKeypair));

  const assetMint = publicKey("8yn4ej8hHnbZvG9P45sY7XALZLUsbBsAQzvijFRzq57s");

  try {
    console.log("Memproses thawAsset pada Metaplex Core...");

    await updatePlugin(umi, {
      asset: assetMint,
      plugin: {
        type: "FreezeDelegate",
        frozen: false,
      },
    }).sendAndConfirm(umi);

    console.log(
      `✅ BERHASIL! NFT ${assetMint.toString()} berhasil di-unfreeze!`,
    );
  } catch (err) {
    console.error("❌ Gagal Unfreeze:", err);
  }
}

async function getNftTitle() {
  const umi = createUmi("https://api.mainnet-beta.solana.com").use(mplCore());
  const assetAddress = publicKey(
    "8yn4ej8hHnbZvG9P45sY7XALZLUsbBsAQzvijFRzq57s",
  );

  try {
    const asset = await fetchAsset(umi, assetAddress);

    console.log("========================================");
    console.log("📌 Judul NFT :", asset.name);
    console.log("🔗 URI JSON  :", asset.uri);
    console.log("👑 Owner     :", asset.owner.toString());
    console.log("========================================");
  } catch (error) {
    console.error("Gagal mengambil data NFT:", error);
  }
}

main();
