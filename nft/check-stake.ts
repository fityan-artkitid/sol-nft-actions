// execute: npx ts-node-esm nft/check-stake.ts
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
  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || idl.address);
  const CURRENT_PROJECT_ID = process.env.NEXT_PUBLIC_CURRENT_PROJECT_ID || "boschoko99";
  
  // Mint address NFT yang ingin kamu cek
  const NFT_ASSET_ADDRESS = new PublicKey("3DNsDgmBzvoUSu3vphEScSedyD4dznBZrG4SMj8tKRJQ");

  const umi = createUmi(RPC_ENDPOINT).use(mplCore());

  const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey));
  umi.use(keypairIdentity(walletKeypair));

  // 1. Hitung Kode ID Epoch Berjalan secara Otomatis (Format YYYYMM)
  const date = new Date();
  const currentEpoch = parseInt(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`, 10);

  // Hitung PDA Alamat Akun
  const [projectConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("project_config"), Buffer.from(CURRENT_PROJECT_ID)],
    PROGRAM_ID
  );

  const [stakeStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake"), NFT_ASSET_ADDRESS.toBuffer()],
    PROGRAM_ID
  );

  const [claimTrackerPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("claim_tracker"), NFT_ASSET_ADDRESS.toBuffer()],
    PROGRAM_ID
  );

  const epochBuffer = Buffer.alloc(4);
  epochBuffer.writeUInt32LE(currentEpoch);
  const [epochRewardLogPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("epoch_log"), Buffer.from(CURRENT_PROJECT_ID), epochBuffer],
    PROGRAM_ID
  );

  const coder = new BorshAccountsCoder(idl as any);
  const p = (txt: string) => txt.padEnd(25, " ");

  console.log(`=======================================================`);
  console.log(`🔍 ${p("NFT Asset")} : ${NFT_ASSET_ADDRESS.toString()}`);
  console.log(`📍 ${p("PDA StakeState")} : ${stakeStatePDA.toBase58()}`);
  console.log(`📍 ${p("PDA ClaimTracker")} : ${claimTrackerPDA.toBase58()}`);
  console.log(`📍 ${p("PDA EpochRewardLog")} : ${epochRewardLogPDA.toBase58()}`);
  console.log(`=======================================================\n`);

  try {
    // 3. Tarik data StakeState
    const stakeAccount = await umi.rpc.getAccount(publicKey(stakeStatePDA.toBase58()));
    if (!stakeAccount.exists) {
      console.log("🔓 STATUS: NFT INI TIDAK SEDANG DI-STAKE (PDA tidak ditemukan).");
      return;
    }

    const decodedStake: any = coder.decode("StakeState", Buffer.from(stakeAccount.data));
    const stakeStartTime = Number(decodedStake.stakeStartTime || decodedStake.stake_start_time);
    const nftWeight = Number(decodedStake.userTotalWeight || decodedStake.user_total_weight || 100);
    const lockDuration = Number(decodedStake.lockDuration || decodedStake.lock_duration || 0);

    console.log("🔒 STATUS                    : NFT INI SEDANG DI-STAKE!");
    console.log(`-------------------------------------------------------`);
    console.log(`📦 ${p("Project ID Bind")} : ${decodedStake.projectId || decodedStake.project_id}`);
    console.log(`👑 ${p("Wallet Pemilik Sah")} : ${(decodedStake.owner as PublicKey).toBase58()}`);
    console.log(`🎯 ${p("Bobot Poin NFT (Weight)")} : ${nftWeight}`);
    console.log(`⏳ ${p("Durasi Komitmen Lock")} : ${lockDuration / (24 * 60 * 60)} Hari`);
    console.log(`🗓️  ${p("Waktu Mulai Staking")} : ${new Date(stakeStartTime * 1000).toLocaleString()}`);

    // Tarik data Project Config riil untuk poin global terupdate
    let currentGlobalWeight = 0;
    const configAccount = await umi.rpc.getAccount(publicKey(projectConfigPDA.toBase58()));
    if (configAccount.exists) {
      const decodedConfig: any = coder.decode("ProjectConfig", Buffer.from(configAccount.data));
      currentGlobalWeight = Number(decodedConfig.totalGlobalWeight || decodedConfig.total_global_weight || 0);
    }

    // 4. Tarik data EpochRewardLog Dinamis dari Blockchain
    let epochAllocatedSol = 0;
    let epochSettledPoints = 0;
    let isEpochAvailable = false;

    const epochAccount = await umi.rpc.getAccount(publicKey(epochRewardLogPDA.toBase58()));
    if (epochAccount.exists) {
      const decodedEpoch: any = coder.decode("EpochRewardLog", Buffer.from(epochAccount.data));
      if (decodedEpoch) {
        isEpochAvailable = true;
        const rawAllocated = decodedEpoch.totalAllocatedSol || decodedEpoch.total_allocated_sol || 0;
        const rawPoints = decodedEpoch.totalSettledPoints || decodedEpoch.total_settled_points || 0;
        epochAllocatedSol = Number(rawAllocated) / 1_000_000_000; 
        epochSettledPoints = Number(rawPoints);
      }
    }

    // Sinkronisasi Logika Pembagi: Bandingkan Global Weight Aktif vs Poin Minimum di Epoch Log
    const activeGlobalPoints = Math.max(currentGlobalWeight, epochSettledPoints);

    // 5. Tarik data UserClaimTracker
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
    console.log(`📊 ${p("Status Pool Pembagi")} : ${isEpochAvailable ? `Aktif (Pool: ${epochAllocatedSol} SOL / Settle Pts Terpilih: ${activeGlobalPoints} Pts)` : "Belum Dibuka (Menggunakan Fallback Base Rate)"}`);

    // 6. 🌟 JALANKAN LOGIKA KALKULASI TICKING ADIL (SINKRON ANCHOR V2)
    const currentTime = Math.floor(Date.now() / 1000);
    const totalSecondsElapsed = Math.max(0, currentTime - lastClaimTimestamp);
    
    // Ekstraksi jumlah hari presisi berdasarkan kode epoch YYYYMM saat ini
    const year = Math.floor(currentEpoch / 100);
    const month = currentEpoch % 100;
    const daysInMonth = new Date(year, month, 0).getDate(); 
    const oneMonthSeconds = daysInMonth * 24 * 60 * 60; // Pembagi rata terikat durasi hari bulan ini

    // Batasi waktu berjalan berdasarkan komitmen batas penguncian aset NFT
    const effectiveSeconds = Math.min(totalSecondsElapsed, lockDuration);
    const progressPercent = (effectiveSeconds / lockDuration) * 100;

    let liveRewardSol = 0;

    if (isEpochAvailable && activeGlobalPoints > 0) {
      // Jatah revenue share maksimal satu bulan penuh
      const totalUserShare = (nftWeight * epochAllocatedSol) / activeGlobalPoints;
      
      // 🌟 RE-FIX: Aliran tetesan linear dibagi dengan total detik bulan berjalan (bukan durasi lock)
      liveRewardSol = (totalUserShare * effectiveSeconds) / oneMonthSeconds;
    } else {
      // Fallback Base Rate jika Log Epoch belum di-set admin
      const totalDaysElapsed = effectiveSeconds / (24 * 60 * 60);
      let baseRate = 0.001;
      if (decodedStake.nftClass === "Champion") baseRate = 0.0015;
      if (decodedStake.nftClass === "Grand Champion") baseRate = 0.0025;
      if (decodedStake.nftClass === "Immortal") baseRate = 0.005;
      liveRewardSol = totalDaysElapsed * baseRate;
    }

    console.log(`-------------------------------------------------------`);
    console.log(`📆 ${p("Jumlah Hari Bulan Ini")} : ${daysInMonth} Hari (${oneMonthSeconds} detik)`);
    console.log(`⏱️  ${p("Waktu Berjalan Sim")} : ${totalSecondsElapsed} detik`);
    console.log(`💰 ${p("Live Unclaim Reward")} : ${liveRewardSol.toFixed(9)} SOL (Progres Lock: ${progressPercent.toFixed(4)}%)`);
    console.log(`=======================================================`);

  } catch (error) {
    console.error("❌ Gagal membaca atau men-decode status stake:", error);
  }
}

checkStakeStatusUmi();