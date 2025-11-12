import type { Environment } from '../../lib/config.js'
import { Contract, parseEther, Wallet } from 'ethers'
import routerAbi from '../../abis/routerV2.json' with { type: 'json' }

type Ctx = { wallets: Wallet[], provider: any, logger: any, dryRun: boolean, env: Environment }

export class VolumeBot {
  private readonly ctx: Ctx
  private timers: NodeJS.Timeout[] = []
  constructor(ctx: Ctx) { this.ctx = ctx }

  async run(configPath: string) {
    const cfg = await this.loadConfig(configPath)
    const intervalMs = cfg.intervalMs ?? 15_000
    const token = cfg.token
    const amountBnb = cfg.amountBnb ?? '0.01'
    const slippageBips = cfg.slippageBips ?? 800

    this.stop()
    
    // 为每个钱包创建一个独立的定时器，但有不同的延迟以防止同时交易
    this.ctx.wallets.forEach((wallet, index) => {
      const timer = setInterval(async () => {
        try {
          await this.oneCycle(token, amountBnb, slippageBips, wallet)
        } catch (err) {
          this.ctx.logger.error({ err, walletAddress: wallet.address }, 'volume cycle error')
        }
      }, intervalMs)
      this.timers.push(timer)
    })
  }

  stop() {
    this.timers.forEach(timer => clearInterval(timer))
    this.timers = []
  }

  private async oneCycle(token: string, amountBnb: string, slippageBips: number, wallet: Wallet) {
    const { env, logger } = this.ctx
    const router = new Contract(env.ROUTER_V2_ADDRESS, routerAbi, wallet)
    const deadline = Math.floor(Date.now() / 1000) + 180

    try {
      // Buy
      const value = parseEther(amountBnb)
      const outBuy: bigint[] = await router.getAmountsOut(value, [env.WBNB_ADDRESS, token])
      const minOutBuy = outBuy[1] - (outBuy[1] * BigInt(slippageBips)) / BigInt(10_000)
      
      logger.debug({ token, amountBnb, walletAddress: wallet.address }, 'volume buy')
      
      if (!this.ctx.dryRun) {
        const txB = await router.swapExactETHForTokens(minOutBuy, [env.WBNB_ADDRESS, token], wallet.address, deadline, { value })
        await txB.wait()
        logger.debug({ txHash: txB.hash, walletAddress: wallet.address }, 'volume buy completed')
      }

      // 等待一个随机时间再卖出，模拟真实交易
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 1000))

      // Sell (ALL) — in practice, set fraction
      const erc20 = new Contract(token, (await import('../../abis/erc20.json')).default as any, wallet)
      const balance: bigint = await erc20.balanceOf(wallet.address)
      
      if (balance > 0) {
        const allowance: bigint = await erc20.allowance(wallet.address, env.ROUTER_V2_ADDRESS)
        
        if (allowance < balance && !this.ctx.dryRun) {
          const txA = await erc20.approve(env.ROUTER_V2_ADDRESS, balance)
          await txA.wait()
          logger.debug({ txHash: txA.hash, walletAddress: wallet.address }, 'volume approve completed')
        }
        
        const outSell: bigint[] = await router.getAmountsOut(balance, [token, env.WBNB_ADDRESS])
        const minOutSell = outSell[1] - (outSell[1] * BigInt(slippageBips)) / BigInt(10_000)
        
        logger.debug({ token, balance: balance.toString(), walletAddress: wallet.address }, 'volume sell')
        
        if (!this.ctx.dryRun) {
          const txS = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            balance, minOutSell, [token, env.WBNB_ADDRESS], wallet.address, deadline
          )
          await txS.wait()
          logger.debug({ txHash: txS.hash, walletAddress: wallet.address }, 'volume sell completed')
        }
      } else {
        logger.debug({ walletAddress: wallet.address }, 'no tokens to sell')
      }
    } catch (error) {
      logger.error({ error, walletAddress: wallet.address, token }, 'Volume cycle failed')
    }
  }

  private async loadConfig(p: string) {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const resolved = path.resolve(process.cwd(), p)
    return JSON.parse(fs.readFileSync(resolved, 'utf-8'))
  }
}


