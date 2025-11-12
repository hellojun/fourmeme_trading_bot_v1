import type { Environment } from '../../lib/config.js'
import { Contract, parseEther, Wallet } from 'ethers'
import routerAbi from '../../abis/routerV2.json' with { type: 'json' }
import { Notifier } from '../../lib/notifier.js'

type Ctx = { wallets: Wallet[], provider: any, logger: any, dryRun: boolean, env: Environment }

export class CopyTrader {
  private readonly ctx: Ctx
  constructor(ctx: Ctx) { this.ctx = ctx }

  async run(configPath: string) {
    const cfg = await this.loadConfig(configPath)
    this.ctx.logger.info('Starting copy trader...')

    this.ctx.provider.on('pending', async (txHash: string) => {
      try {
        const tx = await this.ctx.provider.getTransaction(txHash)
        if (!tx || !tx.to) return
        if (!cfg.targets?.some((a: string) => a.toLowerCase() === tx.from?.toLowerCase())) return

        // naive: detect router usage and mirror small % trade into same token path
        if (tx.to.toLowerCase() === this.ctx.env.ROUTER_V2_ADDRESS.toLowerCase()) {
          const percent = cfg.positionPercent ?? 10
          const spend = (BigInt(parseEther(cfg.maxBnbPerTrade ?? '0.05')) * BigInt(percent)) / BigInt(100)
          
          // 使用所有钱包进行跟单交易
          const promises = this.ctx.wallets.map(wallet => 
            this.quickMirrorBuy(cfg.defaultToken, spend, wallet, tx.from)
          )
          await Promise.allSettled(promises) // 使用 allSettled 避免一个失败影响其他
        }
      } catch (error) {
        this.ctx.logger.error({ error, txHash }, 'Copy trading error')
      }
    })
  }

  private async quickMirrorBuy(token: string, amountWei: bigint, wallet: Wallet, originalFrom?: string) {
    const { env, logger } = this.ctx
    const router = new Contract(env.ROUTER_V2_ADDRESS, routerAbi, wallet)
    const path = [env.WBNB_ADDRESS, token]
    const deadline = Math.floor(Date.now() / 1000) + 180
    
    try {
      const amounts: bigint[] = await router.getAmountsOut(amountWei, path)
      const minOut = amounts[amounts.length - 1] - (amounts[amounts.length - 1] * BigInt(700)) / BigInt(10_000)
      
      logger.debug({ 
        token, 
        amountWei: amountWei.toString(), 
        walletAddress: wallet.address,
        originalFrom 
      }, 'mirror buy')
      
      const notifier = new Notifier({ 
        botToken: this.ctx.env.TELEGRAM_BOT_TOKEN, 
        chatId: this.ctx.env.TELEGRAM_CHAT_ID 
      })
      
      await notifier.telegram(
        `📣 Mirrored trade\nWallet: <code>${wallet.address}</code>\nFrom: <code>${originalFrom}</code>\nToken: <code>${token}</code>`
      )
      
      if (this.ctx.dryRun) return
      
      const tx = await router.swapExactETHForTokens(minOut, path, wallet.address, deadline, { value: amountWei })
      await tx.wait()
      
      logger.debug({ 
        txHash: tx.hash, 
        walletAddress: wallet.address, 
        originalFrom 
      }, 'mirror buy completed')
    } catch (error) {
      logger.error({ 
        error, 
        walletAddress: wallet.address, 
        token, 
        originalFrom 
      }, 'Mirror buy failed')
      throw error
    }
  }

  private async loadConfig(p: string) {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const resolved = path.resolve(process.cwd(), p)
    return JSON.parse(fs.readFileSync(resolved, 'utf-8'))
  }
}


