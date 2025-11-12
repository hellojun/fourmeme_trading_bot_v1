import { Contract, parseEther, Wallet } from 'ethers'
import routerAbi from '../../abis/routerV2.json' with { type: 'json' }
import erc20Abi from '../../abis/erc20.json' with { type: 'json' }
import type { Environment } from '../../lib/config.js'
import { Notifier } from '../../lib/notifier.js'

type Ctx = {
  wallets: Wallet[]
  provider: any
  logger: any
  dryRun: boolean
  env: Environment
}

export class Sniper {
  private readonly ctx: Ctx
  constructor(ctx: Ctx) { this.ctx = ctx }

  async run(configPath: string) {
    const cfg = await this.loadConfig(configPath)
    for (const t of cfg.targets ?? []) {
      // 并发使用所有钱包进行狙击
      const promises = this.ctx.wallets.map(wallet => 
        this.buyToken(t.token, t.maxBnb ?? '0.05', t.slippageBips ?? 800, wallet)
      )
      await Promise.all(promises)
    }
  }

  private async buyToken(tokenAddress: string, maxBnb: string, slippageBips: number, wallet: Wallet) {
    const { env, logger } = this.ctx
    const router = new Contract(env.ROUTER_V2_ADDRESS, routerAbi, wallet)
    const path = [env.WBNB_ADDRESS, tokenAddress]
    const value = parseEther(maxBnb)
    const deadline = Math.floor(Date.now() / 1000) + 180

    try {
      const amounts: bigint[] = await router.getAmountsOut(value, path)
      if (amounts.length < 2) {
        throw new Error('Invalid router path or illiquid pair')
      }
      const expectedOut: bigint = amounts[amounts.length - 1]
      const minOut = expectedOut - (expectedOut * BigInt(slippageBips)) / BigInt(10_000)

      logger.info({ 
        tokenAddress, 
        maxBnb, 
        minOut: minOut.toString(), 
        walletAddress: wallet.address 
      }, 'sniper buy')
      
      const notifier = new Notifier({ 
        botToken: this.ctx.env.TELEGRAM_BOT_TOKEN, 
        chatId: this.ctx.env.TELEGRAM_CHAT_ID 
      })
      
      await notifier.telegram(
        `🟢 Sniper buy\nWallet: <code>${wallet.address}</code>\nToken: <code>${tokenAddress}</code>\nSpend: ${maxBnb} BNB`
      )
      
      if (this.ctx.dryRun) return

      const tx = await router.swapExactETHForTokens(minOut, path, wallet.address, deadline, { value })
      logger.info({ hash: tx.hash, walletAddress: wallet.address }, 'sniper tx sent')
      await tx.wait()
      await notifier.telegram(`✅ Buy confirmed\nWallet: <code>${wallet.address}</code>\nTx: <code>${tx.hash}</code>`)
    } catch (error) {
      logger.error({ error, walletAddress: wallet.address, tokenAddress }, 'Sniper buy failed')
      throw error
    }
  }

  private async loadConfig(p: string) {
    const fs = await import('fs')
    const path = await import('path')
    const resolved = path.resolve(process.cwd(), p)
    return JSON.parse(fs.readFileSync(resolved, 'utf-8'))
  }
}


