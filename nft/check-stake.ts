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

async function checkStakeStatusFull() {
  const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || idl.address);
  const CURRENT_PROJECT_ID = process.env.NEXT_PUBLIC_CURRENT_PROJECT_ID || "boschoko99";
  
  // Mint address NFT yang ingin kamu cek
  const NFT_ASSET_ADDRESS = new PublicKey("4jEeEXadaFAptTpe6D9FzVDic7zQvkpRRTCAJdrUPfjo");

  const umi = createUmi(RPC_ENDPOINT).use(mplCore());

  const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
  const walletKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletSecretKey));
  umi.use(keypairIdentity(walletKeypair));

  // 1. Hitung Kode ID Epoch Berjalan secara Otomatis (Format YYYYMM)
  const date = new Date();
  const currentEpoch = parseInt(`${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`, 10);

  // 2. Hitung Alamat PDA
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
  const p = (txt: string) => txt.padEnd(28, " ");

  console.log(`=======================================================`);
  console.log(`🔍 ${p("NFT Asset Target")} : ${NFT_ASSET_ADDRESS.toString()}`);
  console.log(`📍 ${p("PDA StakeState")} : ${stakeStatePDA.toBase58()}`);
  console.log(`📍 ${p("PDA ClaimTracker")} : ${claimTrackerPDA.toBase58()}`);
  console.log(`📍 ${p("PDA EpochRewardLog")} : ${epochRewardLogPDA.toBase58()}`);
  console.log(`=======================================================\n`);

  try {
    // 3. Inspeksi Keberadaan Akun di Chain secara Independen
    const stakeAccount = await umi.rpc.getAccount(publicKey(stakeStatePDA.toBase58()));
    const trackerAccount = await umi.rpc.getAccount(publicKey(claimTrackerPDA.toBase58()));

    console.log(`📋 INSPEKSI AKUN PDA ON-CHAIN:`);
    console.log(`   - StakeState   (State Active) : ${stakeAccount.exists ? "✅ ADA (Tersimpan)" : "❌ TIDAK ADA"}`);
    console.log(`   - ClaimTracker (History Log)  : ${trackerAccount.exists ? "⚠️  ADA (Tersimpan)" : "❌ TIDAK ADA"}`);
    console.log(`-------------------------------------------------------\n`);

    // KONDISI A: NFT sedang tidak distake
    if (!stakeAccount.exists) {
      if (trackerAccount.exists) {
        console.log("🚨 STATUS: NFT TIDAK SEDANG DI-STAKE (TAPI PERNAH DI-STAKE SEBELUMNYA)");
        console.log("⚠️  Peringatan: Akun `ClaimTracker` masih menggantung di blockchain.");
        console.log("👉 Jika kamu me-restake NFT ini tanpa `init_if_needed` di Rust, transaksi akan memicu ERROR 0x0!\n");
      } else {
        console.log("🔓 STATUS: NFT INI TERLIHAT BARU (Belum pernah di-stake sama sekali).");
      }
      return;
    }

    // KONDISI B: NFT sedang distake aktif
    const decodedStake: any = coder.decode("StakeState", Buffer.from(stakeAccount.data));
    const stakeStartTime = Number(decodedStake.stakeStartTime || decodedStake.stake_start_time);
    const nftWeight = Number(decodedStake.userTotalWeight || decodedStake.user_total_weight || 100);
    const lockDuration = Number(decodedStake.lockDuration || decodedStake.lock_duration || 0);
    
    const lockEndTime = stakeStartTime + lockDuration;
    const currentTime = Math.floor(Date.now() / 1000);
    const isLockExpired = currentTime >= lockEndTime;

    console.log("🔒 STATUS STAKING              : AKTIF");
    console.log(`-------------------------------------------------------`);
    console.log(`📦 ${p("Project ID Bind")} : ${decodedStake.projectId || decodedStake.project_id}`);
    console.log(`👑 ${p("Wallet Pemilik Sah")} : ${(decodedStake.owner as PublicKey).toBase58()}`);
    console.log(`🎯 ${p("Bobot Poin NFT (Weight)")} : ${nftWeight}`);
    console.log(`⏳ ${p("Durasi Komitmen Lock")} : ${lockDuration / (24 * 60 * 60)} Hari`);
    console.log(`🗓️  ${p("Waktu Mulai Staking")} : ${new Date(stakeStartTime * 1000).toLocaleString()}`);
    console.log(`🏁 ${p("Batas Akhir Lockup")} : ${new Date(lockEndTime * 1000).toLocaleString()}`);
    console.log(`🛡️  ${p("Status Bebas Denda")} : ${isLockExpired ? "✅ Ya (Bebas Denda Emergency)" : "⚠️  Belum (Kena Denda jika Unstake)"}`);

    // Tarik data Project Config riil
    let currentGlobalWeight = 0;
    const configAccount = await umi.rpc.getAccount(publicKey(projectConfigPDA.toBase58()));
    if (configAccount.exists) {
      const decodedConfig: any = coder.decode("ProjectConfig", Buffer.from(configAccount.data));
      currentGlobalWeight = Number(decodedConfig.totalGlobalWeight || decodedConfig.total_global_weight || 0);
    }

    // Tarik data EpochRewardLog Dinamis
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

    const activeGlobalPoints = Math.max(currentGlobalWeight, epochSettledPoints);

    // 4. Decode UserClaimTracker
    let lastClaimTimestamp = stakeStartTime; 
    let lastClaimedEpoch = 0;

    if (trackerAccount.exists) {
      const decodedTracker: any = coder.decode("UserClaimTracker", Buffer.from(trackerAccount.data));
      lastClaimedEpoch = Number(decodedTracker.lastClaimedEpoch || decodedTracker.last_claimed_epoch || 0);
      lastClaimTimestamp = Number(decodedTracker.lastClaimTimestamp || decodedTracker.last_claim_timestamp || stakeStartTime);
    }

    console.log(`\n🗓️  ${p("Epoch Terakhir Diklaim")} : ${lastClaimedEpoch === 0 ? "Belum Pernah" : lastClaimedEpoch}`);
    console.log(`⏳ ${p("Pijakan Klaim Terakhir")} : ${new Date(lastClaimTimestamp * 1000).toLocaleString()}`);
    console.log(`📊 ${p("Status Pool Pembagi")} : ${isEpochAvailable ? `Aktif (Pool: ${epochAllocatedSol} SOL / Settled Pts: ${activeGlobalPoints})` : "Belum Dibuka (Fallback Base Rate)"}`);

    // 5. Kalkulasi Ticking Simulasi Sesuai Logika Rust Baru
    // Waktu perhitungan dibatasi oleh lockEndTime agar tidak bocor setelah durasi habis
    const calculationEndTime = Math.min(currentTime, lockEndTime);
    const effectiveElapsedSeconds = Math.max(0, calculationEndTime - lastClaimTimestamp);

    const year = Math.floor(currentEpoch / 100);
    const month = currentEpoch % 100;
    const daysInMonth = new Date(year, month, 0).getDate(); 
    const oneMonthSeconds = daysInMonth * 24 * 60 * 60;

    const lockProgressPercent = Math.min(100, (Math.max(0, currentTime - stakeStartTime) / lockDuration) * 100);

    let liveRewardSol = 0;

    if (effectiveElapsedSeconds > 0) {
      if (isEpochAvailable && activeGlobalPoints > 0) {
        const totalUserShare = (nftWeight * epochAllocatedSol) / activeGlobalPoints;
        liveRewardSol = (totalUserShare * effectiveElapsedSeconds) / oneMonthSeconds;
      } else {
        const totalDaysElapsed = effectiveElapsedSeconds / (24 * 60 * 60);
        let baseRate = 0.001;
        if (decodedStake.nftClass === "Champion") baseRate = 0.0015;
        if (decodedStake.nftClass === "Grand Champion") baseRate = 0.0025;
        if (decodedStake.nftClass === "Immortal") baseRate = 0.005;
        liveRewardSol = totalDaysElapsed * baseRate;
      }
    }

    console.log(`-------------------------------------------------------`);
    console.log(`📆 ${p("Jumlah Hari Bulan Ini")} : ${daysInMonth} Hari (${oneMonthSeconds} detik)`);
    console.log(`⏱️  ${p("Waktu Klaim Efektif")} : ${effectiveElapsedSeconds} detik (Dari sisa kuota lockup)`);
    console.log(`💰 ${p("Live Unclaim Reward")} : ${liveRewardSol.toFixed(9)} SOL`);
    console.log(`📈 ${p("Progres Masa Lockup")} : ${lockProgressPercent.toFixed(2)}% ${isLockExpired ? "(SELESAI)" : "(BERJALAN)"}`);
    console.log(`=======================================================`);

  } catch (error) {
    console.error("❌ Gagal membaca atau men-decode status stake:", error);
  }
}

checkStakeStatusFull();