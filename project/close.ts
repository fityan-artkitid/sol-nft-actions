// execute: npx ts-node-esm close-project.ts
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import idl from "../artkit_stake_v1.json" with { type: "json" };
import { getEnvironmentData } from "worker_threads";

async function run() {
    const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8899";
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    
    // ⚠️ MASUKKAN ID PROJEK CACAT YANG INGIN KAMU HAPUS PERMANEN
    const projectId = "boschoko"; 

    // Load Wallet Admin asli pengisi projectConfig
    const walletSecretKey = JSON.parse(fs.readFileSync("./ids.json", "utf-8"));
    const signerKeypair = Keypair.fromSecretKey(new Uint8Array(walletSecretKey));

    const walletWrapper = new Wallet(signerKeypair);
    const provider = new AnchorProvider(connection, walletWrapper, { preflightCommitment: "confirmed" });
    const program = new Program(idl as any, provider);

    // Cari alamat PDA Project Config yang mau di-delete
    const [projectConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("project_config"), Buffer.from(projectId)],
        program.programId,
    );

    console.log(`Mengirim perintah penghapusan untuk projek: "${projectId}" (PDA: ${projectConfigPDA.toBase58()})...`);

    try {
        const tx = await program.methods.closeProject!()
            .accountsStrict({
                admin: signerKeypair.publicKey,
                projectConfig: projectConfigPDA,
            })
            .rpc();

        console.log(`\n🎉 SUKSES! Projek "${projectId}" berhasil dimusnahkan dari blockchain.`);
        console.log("Signature Transaksi:", tx);
        console.log("💡 Biaya simpanan SOL di PDA tersebut sudah ditransfer balik ke wallet kamu!");
    } catch (err) {
        console.error("❌ Gagal menghapus projek:", err);
    }
}

run();