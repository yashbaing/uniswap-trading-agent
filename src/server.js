const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const { ethers } = require("ethers");
const { z } = require("zod");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const API_BASE_URL = process.env.UNISWAP_API_BASE_URL || "https://trade-api.gateway.uniswap.org/v1";
const API_KEY = process.env.UNISWAP_API_KEY;
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const PORT = Number(process.env.PORT || 3000);
const CHAIN_PRESET = process.env.CHAIN_PRESET || "mainnet";
const CHAIN_PRESETS = { mainnet: 1, base: 8453, arbitrum: 42161 };

if (!API_KEY) {
  throw new Error("Missing UNISWAP_API_KEY in environment.");
}

const provider = RPC_URL ? new ethers.JsonRpcProvider(RPC_URL) : null;
const wallet = PRIVATE_KEY && provider ? new ethers.Wallet(PRIVATE_KEY, provider) : null;

const headers = {
  "x-api-key": API_KEY,
  "content-type": "application/json",
};

const baseTradeSchema = z.object({
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amount: z.string().min(1).optional(),
  amountHuman: z.string().optional(),
  tokenInDecimals: z.number().int().min(0).max(36).optional(),
  type: z.enum(["EXACT_INPUT", "EXACT_OUTPUT"]).default("EXACT_INPUT"),
  chainId: z.number().int().positive().optional(),
  chain: z.enum(["mainnet", "base", "arbitrum"]).optional(),
  slippageTolerance: z.number().positive().optional(),
  recipient: z.string().optional(),
});

const quoteSchema = baseTradeSchema.refine((v) => Boolean(v.amount || v.amountHuman), {
  message: "Either amount or amountHuman is required",
});

const tradeSchema = quoteSchema.extend({
  deadlineSeconds: z.number().int().positive().optional(),
});

async function postTradeApi(path, payload) {
  const response = await axios.post(`${API_BASE_URL}${path}`, payload, { headers });
  return response.data;
}

function getWalletOrThrow() {
  if (!wallet) {
    throw new Error("Trading wallet not configured. Set RPC_URL and WALLET_PRIVATE_KEY in .env.");
  }
  return wallet;
}

function getChainId(parsed) {
  if (parsed.chainId) {
    return parsed.chainId;
  }
  if (parsed.chain && CHAIN_PRESETS[parsed.chain]) {
    return CHAIN_PRESETS[parsed.chain];
  }
  return CHAIN_PRESETS[CHAIN_PRESET] || 1;
}

async function resolveTokenDecimals(tokenAddress) {
  if (!provider) {
    throw new Error("RPC_URL is required to auto-resolve token decimals.");
  }
  const erc20 = new ethers.Contract(tokenAddress, ["function decimals() view returns (uint8)"], provider);
  const decimals = await erc20.decimals();
  return Number(decimals);
}

async function resolveAmount(parsed) {
  if (parsed.amount) {
    return parsed.amount;
  }
  if (!parsed.amountHuman) {
    throw new Error("Provide amount or amountHuman.");
  }
  const decimals =
    typeof parsed.tokenInDecimals === "number" ? parsed.tokenInDecimals : await resolveTokenDecimals(parsed.tokenIn);
  return ethers.parseUnits(parsed.amountHuman, decimals).toString();
}

async function sendTxFromRequest(txRequest) {
  const activeWallet = getWalletOrThrow();
  if (!txRequest?.to || !txRequest?.data) {
    throw new Error("Transaction request missing required fields: to/data");
  }
  const tx = await activeWallet.sendTransaction({
    to: txRequest.to,
    data: txRequest.data,
    value: txRequest.value ? BigInt(txRequest.value) : 0n,
    gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
    maxFeePerGas: txRequest.maxFeePerGas ? BigInt(txRequest.maxFeePerGas) : undefined,
    maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas ? BigInt(txRequest.maxPriorityFeePerGas) : undefined,
    gasPrice: txRequest.gasPrice ? BigInt(txRequest.gasPrice) : undefined,
  });
  const receipt = await tx.wait();
  return { hash: tx.hash, receipt };
}

async function buildQuotePayload(parsed) {
  const activeWallet = getWalletOrThrow();
  const chainId = getChainId(parsed);
  const amount = await resolveAmount(parsed);
  return {
    tokenInChainId: chainId,
    tokenOutChainId: chainId,
    tokenIn: parsed.tokenIn,
    tokenOut: parsed.tokenOut,
    amount,
    type: parsed.type,
    ...(parsed.slippageTolerance ? { slippageTolerance: parsed.slippageTolerance } : {}),
    recipient: parsed.recipient || activeWallet.address,
    swapper: activeWallet.address,
  };
}

app.get("/health", async (_req, res) => {
  try {
    if (!wallet || !provider) {
      return res.json({
        ok: true,
        mode: "limited",
        message: "Server running. Add RPC_URL + WALLET_PRIVATE_KEY for live trading.",
      });
    }
    const balance = await provider.getBalance(wallet.address);
    res.json({
      ok: true,
      mode: "trading",
      walletAddress: wallet.address,
      walletEthBalance: ethers.formatEther(balance),
      network: await provider.getNetwork(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/chains", (_req, res) => {
  res.json({ ok: true, default: CHAIN_PRESET, chains: CHAIN_PRESETS });
});

app.post("/quote", async (req, res) => {
  try {
    const parsed = quoteSchema.parse(req.body);
    const payload = await buildQuotePayload(parsed);
    const quote = await postTradeApi("/quote", payload);
    res.json({ ok: true, quote, requestPayload: payload });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: "Invalid request body", issues: error.issues });
    }
    const detail = error.response?.data || error.message;
    res.status(500).json({ ok: false, error: detail });
  }
});

app.post("/trade", async (req, res) => {
  try {
    const parsed = tradeSchema.parse(req.body);
    const quotePayload = await buildQuotePayload(parsed);
    const quote = await postTradeApi("/quote", quotePayload);
    const swapPayload = {
      ...quotePayload,
      quote,
      deadlineSeconds: parsed.deadlineSeconds || 180,
    };
    const swap = await postTradeApi("/swap", swapPayload);
    const approvals = Array.isArray(swap.approvals) ? swap.approvals : swap.approval ? [swap.approval] : [];
    const approvalReceipts = [];
    for (const approvalTx of approvals) {
      const result = await sendTxFromRequest(approvalTx);
      approvalReceipts.push(result);
    }
    const txRequest = swap.swap || swap.tx || swap.transaction || swap.swapTx || {};
    const tradeResult = await sendTxFromRequest(txRequest);
    res.json({
      ok: true,
      walletAddress: getWalletOrThrow().address,
      approvalTransactions: approvalReceipts,
      txHash: tradeResult.hash,
      receipt: tradeResult.receipt,
      quoteSummary: quote?.quote || quote,
      swapSummary: swap?.routing || swap,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: "Invalid request body", issues: error.issues });
    }
    const detail = error.response?.data || error.message;
    res.status(500).json({ ok: false, error: detail });
  }
});

app.post("/strategy/dca", async (req, res) => {
  try {
    const parsed = tradeSchema.parse(req.body);
    const runs = Number(req.body.runs || 1);
    const intervalMs = Number(req.body.intervalMs || 0);
    if (!Number.isInteger(runs) || runs < 1 || runs > 20) {
      return res.status(400).json({ ok: false, error: "runs must be an integer between 1 and 20" });
    }
    const results = [];
    for (let i = 0; i < runs; i += 1) {
      const quotePayload = await buildQuotePayload(parsed);
      const quote = await postTradeApi("/quote", quotePayload);
      const swap = await postTradeApi("/swap", {
        ...quotePayload,
        quote,
        deadlineSeconds: parsed.deadlineSeconds || 180,
      });
      const txRequest = swap.swap || swap.tx || swap.transaction || swap.swapTx || {};
      const tradeResult = await sendTxFromRequest(txRequest);
      results.push({ index: i + 1, txHash: tradeResult.hash, receipt: tradeResult.receipt });
      if (i < runs - 1 && intervalMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    res.json({ ok: true, walletAddress: getWalletOrThrow().address, runs, results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: "Invalid request body", issues: error.issues });
    }
    const detail = error.response?.data || error.message;
    res.status(500).json({ ok: false, error: detail });
  }
});

app.listen(PORT, () => {
  console.log(`Uniswap trading agent running on http://localhost:${PORT}`);
  if (wallet) {
    console.log(`Trading wallet: ${wallet.address}`);
    console.log(`Default chain preset: ${CHAIN_PRESET}`);
  } else {
    console.log("Limited mode active (missing RPC_URL and/or WALLET_PRIVATE_KEY).");
  }
});
