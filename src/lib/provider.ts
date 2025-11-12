import { JsonRpcProvider, Wallet } from 'ethers'
import type { Environment } from './config.js'

export function createWalletsAndProvider(env: Environment) {
  const provider = new JsonRpcProvider(env.RPC_URL, env.CHAIN_ID, { staticNetwork: true })
  const wallets = env.PRIVATE_KEYS.map(privateKey => new Wallet(privateKey, provider))
  return { provider, wallets }
}

// 保持向后兼容的单钱包版本
export function createWalletAndProvider(env: Environment) {
  const provider = new JsonRpcProvider(env.RPC_URL, env.CHAIN_ID, { staticNetwork: true })
  const wallet = new Wallet(env.PRIVATE_KEYS[0], provider)
  return { provider, wallet }
}


