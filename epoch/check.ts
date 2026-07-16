// execute: npx ts-node-esm project/check-epochs.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import idl from "../artkit_stake_v1.json" with { type: "json" };
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function run() {
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "";
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

    console.log(`🔍 Menghubungi Solana Cluster... Menarik data keuangan proyek: "${targetProjectId}"...\n`);

    try {
        // 1. Hitung alamat PDA Project Config (Brankas Utama) untuk cek total saldo saat ini
        const [projectConfigPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("project_config"), Buffer.from(targetProjectId)],
            program.programId,
        );
        
        const vaultBalanceLamports = await connection.getBalance(projectConfigPDA);
        const vaultBalanceSol = vaultBalanceLamports / 1_000_000_000;

        // 2. Tarik SEMUA akun bertipe epochRewardLog dan userClaimTracker dari blockchain
        const allEpochLogs = await (program.account as any).epochRewardLog.all();
        const allClaimTrackers = await (program.account as any).userClaimTracker.all();
        const allStakeStates = await (program.account as any).stakeState.all();

        // Filter epoch log milik projek target saja
        const filteredEpochs = allEpochLogs.filter((log: any) => {
            return log.account.projectId === targetProjectId || log.account.project_id === targetProjectId;
        });

        if (filteredEpochs.length === 0) {
            console.log(`ℹ️ Tidak ditemukan Epoch yang aktif untuk proyek "${targetProjectId}".`);
            console.log(`Silakan jalankan script set-epoch.ts terlebih dahulu.`);
            return;
        }

        console.log(`=======================================================`);
        console.log(`📊 LAPORAN KEUANGAN REWARD POOL [Projek: ${targetProjectId}]`);
        console.log(`=======================================================`);
        console.log(`🏦 Total Kas di Brankas PDA saat ini : ${vaultBalanceSol.toFixed(4)} SOL`);
        console.log(`=======================================================`);

        // Tampilkan data epoch beserta akumulasi klaimnya dengan titik dua sederet
        filteredEpochs.forEach((log: any, index: number) => {
            const acc = log.account;
            
            const epochId = acc.epochId || acc.epoch_id;
            const rawAllocatedSol = acc.totalAllocatedSol || acc.total_allocated_sol || 0;
            const rawSettledPoints = acc.totalSettledPoints || acc.total_settled_points || 0;
            
            const allocatedSol = Number(rawAllocatedSol) / 1_000_000_000;

            // 3. Filter tracker klaim yang sukses mencairkan dana khusus di Epoch ini
            const claimsInEpoch = allClaimTrackers.filter((tracker: any) => {
                const lastClaimed = tracker.account.lastClaimedEpoch || tracker.account.last_claimed_epoch;
                return Number(lastClaimed) === Number(epochId);
            });

            // 4. Hitung berapa total nominal SOL yang sudah dikuras/diklaim oleh user pada epoch ini
            let totalClaimedLamports = 0;

            claimsInEpoch.forEach((tracker: any) => {
                const assetKey = (tracker.account.asset as PublicKey).toBase58();
                
                const matchStake = allStakeStates.find((stake: any) => {
                    const stakeAsset = stake.account.asset as PublicKey;
                    return stakeAsset.toBase58() === assetKey;
                });

                if (matchStake && Number(rawSettledPoints) > 0) {
                    const userWeight = matchStake.account.userTotalWeight || matchStake.account.user_total_weight || 0;
                    const userShare = (BigInt(userWeight) * BigInt(rawAllocatedSol)) / BigInt(rawSettledPoints);
                    totalClaimedLamports += Number(userShare);
                }
            });

            const totalClaimedSol = totalClaimedLamports / 1_000_000_000;
            const remainingRewardSol = Math.max(0, allocatedSol - totalClaimedSol);

            // Variabel perapih baris teks terminal (Padding string)
            const p = (txt: string) => txt.padEnd(25, " ");

            console.log(`${index + 1}. 🗓️  ${p("Epoch ID")} : ${epochId}`);
            console.log(`   🏛️  ${p("Alamat PDA Akun")} : ${log.publicKey.toBase58()}`);
            console.log(`   💰 ${p("Target Alokasi Pool")} : ${allocatedSol.toFixed(4)} SOL`);
            console.log(`   ✅ ${p("Sudah Di-klaim User")} : ${totalClaimedSol.toFixed(4)} SOL (${claimsInEpoch.length} NFT)`);
            console.log(`   ⏳ ${p("Sisa Alokasi Terbuka")} : ${remainingRewardSol.toFixed(4)} SOL`);
            console.log(`   🎯 ${p("Total Poin Global")} : ${rawSettledPoints.toString()}`);
            console.log(`-------------------------------------------------------`);
        });

    } catch (err) {
        console.error("❌ Gagal menarik laporan statistik keuangan Epoch:", err);
    }
}

run();