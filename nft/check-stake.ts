// execute: npx ts-node-esm project/check-state.ts
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { publicKey, keypairIdentity } from "@metaplex-foundation/umi";
import { PublicKey } from "@solana/web3.js";
import { BorshAccountsCoder } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as dotenv from "dotenv";
import idl from "../artkit_stake_v1.json" with { type: "json" };

dotenv.config({ path: ".env" });

async function checkStakeStatusUmi() {
  // 🔍 Ganti dengan alamat mint NFT Core yang mau lu cek secara live
  const NFT_ASSET_ADDRESS = new PublicKey("6dJ2CPuFKnDKeqGyATRzucVwgHvXGwuPZyUrBCXi8g2i");

  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
  const umi = createUmi(RPC_ENDPOINT).use(mplCore());

  const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey));
  umi.use(keypairIdentity(walletKeypair));

  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || idl.address);

  // 1. Hitung PDA StakeState
  const [stakeStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), NFT_ASSET_ADDRESS.toBuffer()],
    PROGRAM_ID
  );

  // 2. Hitung PDA UserClaimTracker Permanen
  const [claimTrackerPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("claim_tracker"), NFT_ASSET_ADDRESS.toBuffer()],
    PROGRAM_ID
  );

  const coder = new BorshAccountsCoder(idl as any);
  
  // Fungsi helper untuk merapikan teks alfabet (Tanpa diganggu emoji)
  const p = (txt: string) => txt.padEnd(25, " ");

  console.log(`=======================================================`);
  console.log(`🔍 ${p("NFT Asset")} : ${NFT_ASSET_ADDRESS.toString()}`);
  console.log(`📍 ${p("PDA StakeState")} : ${stakeStatePDA.toBase58()}`);
  console.log(`📍 ${p("PDA ClaimTracker")} : ${claimTrackerPDA.toBase58()}`);
  console.log(`=======================================================\n`);

  try {
    const stakeAccount = await umi.rpc.getAccount(publicKey(stakeStatePDA.toBase58()));

    if (!stakeAccount.exists) {
      console.log("🔓 STATUS: NFT INI TIDAK SEDANG DI-STAKE (PDA tidak ditemukan).");
      return;
    }

    // Decode Data Akun StakeState
    const decodedStake: any = coder.decode("StakeState", Buffer.from(stakeAccount.data));
    
    console.log("🔒 STATUS                    : NFT INI SEDANG DI-STAKE!");
    console.log(`-------------------------------------------------------`);
    console.log(`📦 ${p("Project ID Bind")} : ${decodedStake.projectId || decodedStake.project_id}`);
    console.log(`👑 ${p("Wallet Pemilik Sah")} : ${(decodedStake.owner as PublicKey).toBase58()}`);
    console.log(`🎯 ${p("Bobot Poin NFT (Weight)")} : ${decodedStake.userTotalWeight?.toString() || decodedStake.user_total_weight?.toString()}`);
    console.log(`⏳ ${p("Durasi Komitmen Lock")} : ${Number(decodedStake.lockDuration || decodedStake.lock_duration) / (24 * 60 * 60)} Hari`);
    
    const stakeStartTime = Number(decodedStake.stakeStartTime || decodedStake.stake_start_time);
    console.log(`🗓️  ${p("Waktu Mulai Staking")} : ${new Date(stakeStartTime * 1000).toLocaleString()}`);

    // 3. Ambil data tracking klaim waktu dari PDA Tracker
    const trackerAccount = await umi.rpc.getAccount(publicKey(claimTrackerPDA.toBase58()));
    let lastClaimTimestamp = stakeStartTime; 
    let lastClaimedEpoch = 0;

    if (trackerAccount.exists) {
      const decodedTracker: any = coder.decode("UserClaimTracker", Buffer.from(trackerAccount.data));
      lastClaimedEpoch = Number(decodedTracker.lastClaimedEpoch || decodedTracker.last_claimed_epoch || 0);
      lastClaimTimestamp = Number(decodedTracker.lastClaimTimestamp || decodedTracker.last_claim_timestamp || stakeStartTime);
    }

    console.log(`🗓️  ${p("Epoch Terakhir Diklaim")} : ${lastClaimedEpoch === 0 ? "Belum Pernah" : lastClaimedEpoch}`);
    console.log(`⏳ ${p("Pijakan Klaim Terakhir")} : ${new Date(lastClaimTimestamp * 1000).toLocaleString()}`);

    // 4. Kalkulasi Live Ticking Reward Berjalan (30 Hari Konstan)
    const currentTime = Math.floor(Date.now() / 1000);
    const totalSecondsElapsed = currentTime - lastClaimTimestamp;
    
    const oneMonthSeconds = 30 * 24 * 60 * 60;
    const progressFraction = Math.min(1, totalSecondsElapsed / oneMonthSeconds);

    const simulatedMonthlyAllocated = 0.1333; 
    const liveRewardSol = simulatedMonthlyAllocated * progressFraction;

    console.log(`-------------------------------------------------------`);
    console.log(`⏱️  ${p("Waktu Berjalan Sim")} : ${totalSecondsElapsed} detik`);
    console.log(`💰 ${p("Live Unclaim Reward")} : ${liveRewardSol.toFixed(6)} SOL (Progres: ${(progressFraction * 100).toFixed(2)}%)`);
    console.log(`=======================================================`);

  } catch (error) {
    console.error("❌ Gagal membaca atau men-decode status stake:", error);
  }
}

checkStakeStatusUmi();