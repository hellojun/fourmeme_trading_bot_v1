import dotenv from 'dotenv';
dotenv.config();

dotenv.config();

export type Environment = {
  RPC_URL: string;
  PRIVATE_KEYS: string[];
  CHAIN_ID: number;
  LOG_LEVEL: 'info' | 'debug' | 'error';
  WBNB_ADDRESS: string;
  ROUTER_V2_ADDRESS: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
};

export function loadEnvironment(): Environment {
  const {
    RPC_URL,
    CHAIN_ID = '56',
    LOG_LEVEL = 'info',
    WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    ROUTER_V2_ADDRESS = '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    ...env
  } = process.env;

  if (!RPC_URL) throw new Error('RPC_URL is required');

  // 收集所有 PRIVATE_KEY_* 环境变量
  const privateKeysArray: string[] = [];
  
  // 按数字顺序收集私钥
  let index = 1;
  while (env[`PRIVATE_KEY_${index}`]) {
    const key = env[`PRIVATE_KEY_${index}`];
    if (key && key.trim().length > 0) {
      privateKeysArray.push(key.trim());
    }
    index++;
  }
  
  // 如果没有找到编号的私钥，检查是否有旧格式的 PRIVATE_KEYS
  if (privateKeysArray.length === 0 && env.PRIVATE_KEYS) {
    privateKeysArray.push(...env.PRIVATE_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0));
  }
  
  if (privateKeysArray.length === 0) {
    throw new Error('At least one private key is required. Use PRIVATE_KEY_1, PRIVATE_KEY_2, etc.');
  }

  console.log(`Loaded ${privateKeysArray.length} private keys from environment variables`);

  return {
    RPC_URL,
    PRIVATE_KEYS: privateKeysArray,
    CHAIN_ID: Number(CHAIN_ID),
    LOG_LEVEL: LOG_LEVEL as Environment['LOG_LEVEL'],
    WBNB_ADDRESS,
    ROUTER_V2_ADDRESS,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
  };
}