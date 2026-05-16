import { useToast } from "@chakra-ui/react";
import { handleSDKError, reconnectRPC, sdk } from "@/lib/odude";
import { ethers } from "ethers";

interface TransactionOptions {
  loadingTitle?: string;
  loadingMessage?: string;
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  onSuccess?: (receipt: any) => void;
  onError?: (error: any) => void;
}

/**
 * Recursively search any object for a value that looks like a tx hash (0x + 64 hex chars).
 * Checks well-known keys first, then falls back to scanning all values.
 */
function findHashDeep(obj: any, depth = 0): string | undefined {
  if (depth > 5) return undefined;
  if (typeof obj === "string" && /^0x[0-9a-fA-F]{64}$/.test(obj)) return obj;
  if (obj && typeof obj === "object") {
    for (const key of ["hash", "transactionHash", "txHash", "tx_hash"]) {
      const val = obj[key];
      if (typeof val === "string" && /^0x[0-9a-fA-F]{64}$/.test(val)) return val;
    }
    for (const val of Object.values(obj)) {
      const found = findHashDeep(val, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Returns true if the object looks like an already-confirmed transaction receipt.
 * Some SDKs skip the tx response and return the receipt directly.
 */
function looksLikeReceipt(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  return (
    ("status" in obj || "blockHash" in obj || "blockNumber" in obj) &&
    ("transactionHash" in obj || "hash" in obj || "logs" in obj)
  );
}

/**
 * Executes a blockchain transaction and waits for on-chain confirmation.
 *
 * Handles all SDK response shapes:
 *  - Direct hash string
 *  - Ethers v5/v6 TransactionResponse (with .wait())
 *  - Already-resolved receipt objects
 *  - Nested objects containing a hash somewhere
 */
export async function executeTransaction(
  txPromise: Promise<any>,
  toast: ReturnType<typeof useToast>,
  options: TransactionOptions = {}
) {
  const {
    loadingTitle = "Transaction Pending",
    loadingMessage = "Please confirm in your wallet...",
    successTitle = "Transaction Confirmed",
    successMessage = "The transaction was successful.",
    errorTitle = "Transaction Failed",
    onSuccess,
    onError,
  } = options;

  let toastId: any;

  try {
    toastId = toast({
      title: loadingTitle,
      description: loadingMessage,
      status: "info",
      duration: null,
      isClosable: false,
    });

    // Step 1: Await the submitted transaction
    const tx = await txPromise;
    console.log("[executeTransaction] raw tx result:", tx);

    // Step 2: If the SDK already returned a receipt, use it directly
    if (looksLikeReceipt(tx)) {
      console.log("[executeTransaction] tx looks like a receipt, using it directly");
      const hash = tx.transactionHash || tx.hash || findHashDeep(tx) || "";
      toast.update(toastId, {
        title: successTitle,
        description: successMessage,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      reconnectRPC();
      if (onSuccess) onSuccess({ ...tx, hash });
      return tx;
    }

    // Step 3: Extract the transaction hash
    const hash = findHashDeep(tx);

    if (!hash) {
      console.error("[executeTransaction] Could not find tx hash. Raw response:", tx);
      throw new Error(
        "No transaction hash received from the SDK. Check the browser console for the raw response."
      );
    }

    console.log("[executeTransaction] found hash:", hash);

    toast.update(toastId, {
      title: "Transaction Submitted",
      description: `Waiting for on-chain confirmation... (${hash.substring(0, 10)}...)`,
      status: "loading",
      duration: null,
    });

    // Step 4: Wait for the receipt using the best available method
    let receipt: any;

    // 4a: Ethers TransactionResponse.wait() — most reliable
    if (tx && typeof tx.wait === "function") {
      console.log("[executeTransaction] waiting via tx.wait()");
      receipt = await tx.wait();
    } else {
      console.log("[executeTransaction] no .wait() method, using provider fallback");

      // 4b: Try the SDK's internal provider
      try {
        let provider = (sdk as any).getProvider?.("basesepolia");
        const savedNetwork = (window as any).localStorage?.getItem?.("odude-last-network");
        if (savedNetwork) {
          provider = (sdk as any).getProvider?.(savedNetwork) ?? provider;
        }
        if (provider && typeof provider.waitForTransaction === "function") {
          receipt = await provider.waitForTransaction(hash);
        }
      } catch (e) {
        console.warn("[executeTransaction] SDK provider fallback failed:", e);
      }

      // 4c: Universal fallback — use the injected wallet (MetaMask / WalletConnect)
      if (!receipt && (window as any).ethereum) {
        console.log("[executeTransaction] using BrowserProvider (injected wallet) fallback");
        const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
        receipt = await browserProvider.waitForTransaction(hash);
      }
    }

    if (!receipt) {
      throw new Error("Could not get transaction receipt. Please verify on the explorer manually.");
    }

    if (Number(receipt.status) === 0) {
      throw new Error("Transaction was reverted on-chain.");
    }

    // Step 5: Success
    const receiptHash = receipt.hash || receipt.transactionHash || hash;
    toast.update(toastId, {
      title: successTitle,
      description: successMessage,
      status: "success",
      duration: 5000,
      isClosable: true,
    });

    reconnectRPC();
    if (onSuccess) onSuccess({ ...receipt, hash: receiptHash });
    return { ...receipt, hash: receiptHash };
  } catch (error: any) {
    console.error("[executeTransaction] error:", error);

    const sdkError = handleSDKError(error);

    if (toastId) {
      toast.update(toastId, {
        title: errorTitle,
        description: sdkError.message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } else {
      toast({
        title: errorTitle,
        description: sdkError.message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    }

    if (onError) onError(error);
    throw error;
  }
}
