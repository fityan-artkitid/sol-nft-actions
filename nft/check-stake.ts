import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { publicKey, keypairIdentity } from "@metaplex-foundation/umi";
import { PublicKey } from "@solana/web3.js"; // Tetap pakai web3.js khusus untuk findProgramAddressSync bawaan Solana
import * as fs from "fs";

async function checkStakeStatusUmi() {
  // 1. Inisialisasi Umi menuju custom localnet proxy kamu
  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
  const umi = createUmi(RPC_ENDPOINT).use(mplCore());

  // 2. Load wallet penanda tangan (Identity)
  const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey));
  umi.use(keypairIdentity(walletKeypair));

  // 3. Masukkan Program ID Staking Anchor & Alamat Mint NFT Core kamu
  const PROGRAM_ID = new PublicKey("7pBtkDwArvZiqC7hgt7cM5VYaFxXXhpA9szQjZm9H3pA");
  const NFT_ASSET_ADDRESS = new PublicKey("6fspXZ5b3F8jbZMQTXP6aYFn12eoudtLaAg7FQX8Wek7");

  // 4. Hitung alamat PDA secara matematis sesuai aturan seed di Rust: [b"stake", asset_pubkey]
  const [stakeStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), NFT_ASSET_ADDRESS.toBuffer()],
    PROGRAM_ID
  );

  const pdaUmiPublicKey = publicKey(stakeStatePDA.toBase58());

  console.log(`==================================================`);
  console.log(`🔎 NFT Asset: ${NFT_ASSET_ADDRESS.toString()}`);
  console.log(`📍 Alamat PDA Terhitung: ${pdaUmiPublicKey}`);
  console.log(`==================================================\n`);

  try {
    // 5. Cek eksistensi akun PDA lewat RPC Umi
    const account = await umi.rpc.getAccount(pdaUmiPublicKey);

    if (!account.exists) {
      console.log("🔓 STATUS: NFT INI TIDAK SEDANG DI-STAKE (PDA tidak ditemukan di Blockchain).");
    } else {
      console.log("🔒 STATUS: NFT INI SEDANG DI-STAKE!");
      console.log(`💰 Saldo SOL di dalam PDA: ${Number(account.lamports.basisPoints) / 1e9} SOL`);
      console.log(`🤖 Program Owner yang memegang PDA: ${account.owner}\n`);
      
      // 6. Melakukan manual slicing data byte array untuk mengambil stake_start_time
      // Struktur Data StakeState kamu di Rust:
      // Offset 0-7  (8 bytes)  : Anchor Discriminator
      // Offset 8-39 (32 bytes) : Owner Pubkey
      // Offset 40-71(32 bytes) : Asset Pubkey
      // Offset 72-79(8 bytes)  : stake_start_time (i64 timestamp)
      
      const dataBuffer = Buffer.from(account.data);
      
      // Ambil Owner Public Key dari buffer byte (offset 8 sampai 40)
      const ownerBytes = dataBuffer.subarray(8, 40);
      const ownerPubkey = new PublicKey(ownerBytes).toString();
      
      // Ambil Timestamp i64 dari buffer byte (offset 72 sampai 80) dalam format Little Endian
      const timestampBytes = dataBuffer.subarray(72, 80);
      const stakeStartTimeBigInt = timestampBytes.readBigInt64LE(0);
      const stakeStartTimeSeconds = Number(stakeStartTimeBigInt);

      // Hitung kalkulasi perkiraan reward berjalan secara live untuk simulasi
      const jamSekarangSeconds = Math.floor(Date.now() / 1000);
      const durasiDetik = jamSekarangSeconds - stakeStartTimeSeconds;
      const durasiHari = durasiDetik / (24 * 60 * 60);
      const rateRewardPerHari = 0.002; // Sesuai display UI kamu
      const akumulasiReward = durasiHari * rateRewardPerHari;

      console.log("📄 PARSING DATA DARI PDA VIA UMI BUFFER:");
      console.log(`   - Wallet Pemilik Sah   : ${ownerPubkey}`);
      console.log(`   - Jam Mulai Staking    : ${new Date(stakeStartTimeSeconds * 1000).toLocaleString()}`);
      console.log(`   - Total Waktu Berjalan : ${durasiDetik} detik (~${durasiHari.toFixed(4)} hari)`);
      console.log(`   - Live Reward Earning  : ${akumulasiReward.toFixed(6)} SOL`);
    }
  } catch (error) {
    console.error("Terjadi kendala saat membaca RPC Umi:", error);
  }
}

checkStakeStatusUmi();