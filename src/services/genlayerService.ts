import { GENLAYER_CONTRACT_ADDRESS } from '../constants';

/**
 * GenLayer Frontend Integration Service
 * This service implements the connection between the React web app and the on-chain intelligent contract.
 * By default, it connects to a testnet RPC. Provide VITE_GENLAYER_RPC_URL in your Vercel Environment Variables.
 */

const GENLAYER_RPC_URL = import.meta.env.VITE_GENLAYER_RPC_URL || "https://testnet.genlayer.com/rpc";

export interface GenLayerRPCResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export const executeGenLayerMethod = async <T>(
  methodName: string, 
  args: any[] = [], 
  isTransaction: boolean = false
): Promise<T> => {
  try {
    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: isTransaction ? "sim_sendTransaction" : "sim_call",
      params: [{
        to: GENLAYER_CONTRACT_ADDRESS,
        data: JSON.stringify({
          method: methodName,
          args: args
        })
      }]
    };

    console.log(`[GenLayer RPC] ${isTransaction ? 'Executing TX' : 'Calling View'}: ${methodName}`, args);

    const response = await fetch(GENLAYER_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`GenLayer node HTTP error: ${response.status}`);
    }

    const data: GenLayerRPCResponse<T> = await response.json();
    
    if (data.error) {
      console.error(`[GenLayer RPC] Error from contract:`, data.error.message);
      throw new Error(data.error.message);
    }

    return data.result as T;
  } catch (error) {
    console.error(`[GenLayer RPC] Failed to connect:`, error);
    throw error;
  }
};

// Application Specific Contract Wrappers
export const genLayerStartGame = async (playerAddr: string) => {
  return executeGenLayerMethod("start_game", [playerAddr], true);
};

export const genLayerSubmitMove = async (playerAddr: string, direction: string) => {
  return executeGenLayerMethod("move", [playerAddr, direction], true);
};

export const genLayerGetHint = async (playerAddr: string) => {
  return executeGenLayerMethod("get_hint", [playerAddr], false);
};

export const genLayerGenerateChallenge = async () => {
  return executeGenLayerMethod("generate_daily_challenge", [], true);
};

export const genLayerGetState = async (playerAddr: string) => {
  return executeGenLayerMethod<string>("get_state", [playerAddr], false);
};
