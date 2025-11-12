## BSC FourMeme 交易机器人

FourMeme(four.meme) BNB 打包器和刷量机器人是一个模块化的、CLI 驱动的交易工具包，专为 BNB 链上的 Four.meme 生态系统量身定制。它包含用于镜像钱包、批量路由和模拟/测量交易量的专业模块——全部基于链上直接运行，无需第三方市场数据服务。


## 模块概览
- **打包器**：执行预定义的交换路由（例如 `WBNB → TOKEN`），具有时序控制；设计可扩展到多重调用。
- **刷量机器人**：以设定节奏进行程序化买卖循环，用于流动性/有机活动测试。
- **通知**：主要生命周期事件的可选 Telegram 警报。
- **风险控制**：允许/禁止列表、最大支出上限和基本的 MEV 感知设置。

## 工作原理

### 打包器流程
- 从配置中读取路由序列 → 执行每个路由并遵守滑点/截止时间设置 → 适合作为多重调用风格扩展的基础。

### 刷量机器人流程
- 按间隔循环 → 小额买入 → 需要时授权 → 部分或全额卖出 → 重复执行，内置限速。

## 开始使用

### 先决条件
- [Node.js 22.15](https://nodejs.org/en/download) 或更新版本
- BNB 链 RPC 端点（可使用默认 RPC）
- 有资金的钱包私钥（BNB）

### 安装依赖
```bash
npm install
```

### 环境设置
将 `.env.example` 复制为 `.env` 并填入所需值。提供了 RPC/PancakeV2/WBNB 主网默认值。要启用 Telegram 通知（可选），请添加：
```
TELEGRAM_BOT_TOKEN=794431:AAH72RqUaevy_nk7BttAGVEqAXXXXXXX
TELEGRAM_CHAT_ID=1002184XXXXXX
```

### 示例配置
您可以从提供的示例开始，并根据需要进行调整。如果使用狙击功能，请将 "0xTokenAddressHere" 占位符替换为目标代币地址。如果使用跟单功能，请在 config.copy.example.json 文件中将 "0xLeaderWalletAddress" 替换为您认为最佳的交易者（如 KOL）的公开钱包地址。其他数据也可以根据需要调整，例如 BNB 数量：
- `config.copy.example.json`
- `config.sniper.example.json`
- `config.bundle.example.json`
- `config.volume.example.json`

## 项目构建
```bash
npm run build

```


## 根据需要开始使用
```bash
# 跟单交易
node dist/index.js copy -c config.copy.example.json

# 狙击（建议先进行模拟运行）
node dist/index.js sniper -c config.sniper.example.json --dry-run

# 打包器
node dist/index.js bundle -c config.bundle.example.json

# 刷量机器人
node dist/index.js volume -c config.volume.example.json
```

提示：所有命令都接受标准 Node/CLI 标志和模块特定选项（查看内联 `--help`）。

## 配置和安全提示
- 以模拟运行模式开始；逐步扩大名义规模。
- 维护禁止列表并在启用实时交易前确认代币/路由器地址。
- 对于快速市场，狙击滑点 3-8%（300-800 基点）是常见的；请先测试。
- 对于跟单交易，设置每笔交易上限和每日最大风险敞口。

## 安全最佳实践
- 永远不要提交密钥或私钥。
- 使用专门的热钱包进行实验。
- 仔细检查代币和路由器合约地址。
- 优先进行模拟运行，然后在生产中使用小额。


## 联系和捐赠
1. 根据过去一个月的表现，使用 "config.copy.example.json" 功能跟单盈利的 KOL 或顶级交易者是最盈利的策略，尽管我不确定这种趋势会持续多久。无论如何，如果这个程序对您有帮助，星标是激励我持续更新的动力！

- ``

2. 如果您有任何建议，这对我的下次更新将极其有帮助！联系我的最佳方式是发送邮件至：
