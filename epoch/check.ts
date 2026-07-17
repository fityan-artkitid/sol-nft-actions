// execute: npx ts-node-esm project/check-epochs.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import idl from "../artkit_stake_v1.json" with { type: "json" };
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function run() {
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    
    // Identitas Tenant/Proyek yang ingin dicek
    const targetProjectId = "boschoko99"; 

    // Load wallet dummy/admin hanya untuk syarat inisialisasi provider Anchor
    const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
    const signerKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));
    const walletWrapper = new Wallet(signerKeypair);
    
    const provider = new AnchorProvider(connection, walletWrapper, {
        preflightCommitment: "confirmed",
    });

    const program = new Program(idl as any, provider);

    console.log(`🔍 Menghubungi Solana Cluster... Menarik data proyek: "${targetProjectId}"...\n`);

    try {
        // 1. Hitung alamat PDA Project Config (Brankas Utama / Global PDA)
        const [projectConfigPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("project_config"), Buffer.from(targetProjectId)],
            program.programId,
        );
        
        // Tarik data saldo dan isi state account dari Global PDA
        const vaultBalanceLamports = await connection.getBalance(projectConfigPDA);
        const vaultBalanceSol = vaultBalanceLamports / 1_000_000_000;
        
        const configAccount: any = await (program.account as any).projectConfig.fetch(projectConfigPDA);

        // 2. Tarik data log pendukung dari blockchain
        const allEpochLogs = await (program.account as any).epochRewardLog.all();
        const allClaimTrackers = await (program.account as any).userClaimTracker.all();
        const allStakeStates = await (program.account as any).stakeState.all();

        // Filter epoch log milik projek target saja
        const filteredEpochs = allEpochLogs.filter((log: any) => {
            return log.account.projectId === targetProjectId || log.account.project_id === targetProjectId;
        });

        const p = (txt: string) => txt.padEnd(25, " ");

        console.log(`=======================================================`);
        console.log(`🌐 DATA KONFIGURASI GLOBAL PROJEK [${targetProjectId}]`);
        console.log(`=======================================================`);
        console.log(`🏛️  ${p("Alamat PDA Global")} : ${projectConfigPDA.toBase58()}`);
        console.log(`👑 ${p("Wallet Admin Utama")} : ${(configAccount.admin as PublicKey).toBase58()}`);
        console.log(`🧬 ${p("Collection Mint Bind")} : ${(configAccount.nftCollection as PublicKey).toBase58()}`);
        console.log(`🎯 ${p("Poin Global Aktif")} : ${configAccount.totalGlobalWeight?.toString() || configAccount.total_global_weight?.toString()} Pts`);
        console.log(`🛡️  ${p("Batas Poin Pengaman")} : ${configAccount.minEffectivePoints?.toString() || configAccount.min_effective_points?.toString()} Pts`);
        console.log(`🚨 ${p("Denda Cabut Stake")} : ${Number(configAccount.emergencyPenaltyLamports || configAccount.emergency_penalty_lamports) / 1_000_000_000} SOL`);
        console.log(`=======================================================`);
        console.log(`📊 LAPORAN KEUANGAN REWARD POOL`);
        console.log(`=======================================================`);
        console.log(`🏦 ${p("Total Kas Asli Saat Ini")} : ${vaultBalanceSol.toFixed(4)} SOL`);
        console.log(`=======================================================`);

        if (filteredEpochs.length === 0) {
            console.log(`ℹ️ Tidak ditemukan Epoch yang aktif untuk proyek "${targetProjectId}".`);
            return;
        }

        // Tampilkan data epoch beserta akumulasi klaimnya
        filteredEpochs.forEach((log: any, index: number) => {
            const acc = log.account;
            const epochId = acc.epochId || acc.epoch_id;
            const rawAllocatedSol = acc.totalAllocatedSol || acc.total_allocated_sol || 0;
            const rawPoints = acc.totalSettledPoints || acc.total_settled_points || 0;
            const allocatedSol = Number(rawAllocatedSol) / 1_000_000_000;

            const claimsInEpoch = allClaimTrackers.filter((tracker: any) => {
                const lastClaimed = tracker.account.lastClaimedEpoch || tracker.account.last_claimed_epoch;
                return Number(lastClaimed) === Number(epochId);
            });

            let totalClaimedLamports = 0;
            claimsInEpoch.forEach((tracker: any) => {
                const assetKey = (tracker.account.asset as PublicKey).toBase58();
                const matchStake = allStakeStates.find((stake: any) => {
                    const stakeAsset = stake.account.asset as PublicKey;
                    return stakeAsset.toBase58() === assetKey;
                });

                if (matchStake && Number(rawPoints) > 0) {
                    const userWeight = matchStake.account.userTotalWeight || matchStake.account.user_total_weight || 0;
                    const userShare = (BigInt(userWeight) * BigInt(rawAllocatedSol)) / BigInt(rawPoints);
                    totalClaimedLamports += Number(userShare);
                }
            });

            const totalClaimedSol = totalClaimedLamports / 1_000_000_000;
            const remainingRewardSol = Math.max(0, allocatedSol - totalClaimedSol);

            console.log(`${index + 1}. 🗓️  ${p("Epoch ID")} : ${epochId}`);
            console.log(`   📝 ${p("Alamat PDA Log Epoch")} : ${log.publicKey.toBase58()}`);
            console.log(`   💰 ${p("Target Alokasi Pool")} : ${allocatedSol.toFixed(4)} SOL`);
            console.log(`   ✅ ${p("Sudah Di-klaim User")} : ${totalClaimedSol.toFixed(4)} SOL (${claimsInEpoch.length} NFT)`);
            console.log(`   ⏳ ${p("Sisa Alokasi Terbuka")} : ${remainingRewardSol.toFixed(4)} SOL`);
            console.log(`   🎯 ${p("Snapshot Poin Global")} : ${rawPoints.toString()}`);
            console.log(`-------------------------------------------------------`);
        });

    } catch (err) {
        console.error("❌ Gagal menarik laporan statistik keuangan Global Proyek:", err);
    }
}

run();