// execute: npx ts-node-esm init-project.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import BN from "bn.js";
import idl from "../artkit_stake_v1.json" with { type: "json" };

// CODE INI AKAN GENERATE "Alamat PDA Config Projekmu" JADI DISINI TEMPAT NAMPUNG POOL DARI BAGI BAGI REWARD. TF KE SINI, PER PROJECT BEDA.

async function run() {
    // PARAMETERNYA
    const RPC_ENDPOINT = "http://127.0.0.1:8899";
    const projectId = "boschoko99"; // INI BIKIN AJA NGASAL, HARUS UNIK TAPI
    // NFT COLLECTION ADDRESSNYA
    const nftCollectionMint = new PublicKey(
        "8ghCYzMZgRuDQ3YiFbE85yTckNzXYvDuKWyrxeCVdwEK",
    );

    const connection = new Connection(RPC_ENDPOINT, "confirmed");

    // 2. Load wallet dari ids.json
    const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
    const signerKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));

    console.log(
        "Alamat Wallet Admin pembayar:",
        signerKeypair.publicKey.toBase58(),
    );

    // 3. Bangun provider Anchor secara mandiri
    const walletWrapper = new Wallet(signerKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, {
        preflightCommitment: "confirmed",
    });

    const program = new Program(idl as any, provider);

    // 4. Cari koordinat alamat PDA Project Config
    const [projectConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("project_config"), Buffer.from(projectId)],
        program.programId,
    );

    // 5. Susun konfigurasi kustom (BN)
    const TiersData = [
        { tierName: "Challenger", basePoints: new BN(100) },
        { tierName: "Champion", basePoints: new BN(150) },
        { tierName: "Grand Champion", basePoints: new BN(250) },
        { tierName: "Immortal", basePoints: new BN(500) },
    ];

    const DurationsData = [
        { days: new BN(30), multiplierBps: 10000 }, // 1.00x Base
        { days: new BN(60), multiplierBps: 10500 }, // 1.05x
        { days: new BN(90), multiplierBps: 11200 }, // 1.12x
        { days: new BN(180), multiplierBps: 12500 }, // 1.25x
        { days: new BN(365), multiplierBps: 16000 }, // 1.60x
    ];

    console.log(
        "Memproses pendaftaran ekosistem multi-tenant untuk Bos Choko...",
    );

    try {
        const tx = await program.methods.registerProject!(
            projectId,
            nftCollectionMint,
            new BN(1500), // min_effective_points (Safe pool divider)
            new BN(50000000), // Denda kabur awal: 0.05 SOL (dalam lamports)
            TiersData,
            DurationsData,
        )
            .accountsStrict({
                admin: signerKeypair.publicKey,
                projectConfig: projectConfigPDA,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log("🎉 Ekosistem Bos Choko SUKSES terdaftar di Blockchain!");
        console.log("Signature Transaksi:", tx);
        console.log("Alamat PDA Config Projekmu:", projectConfigPDA.toBase58());
    } catch (err) {
        console.error("❌ Gagal mengeksekusi instruksi register_project:", err);
    }
}

run();
