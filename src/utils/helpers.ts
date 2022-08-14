import {
  nodeUtils,
  Transaction,
  transactionUtils,
  Wallet,
} from '@coti-io/crypto';
import { exec } from './promise-helper';
import { HardForks } from '@coti-io/crypto/dist/utils/transactionUtils';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import axios from 'axios';

const logger = new Logger('helpers');

export type NodeResponse = {
  [nodeHash: string]: {
    webServerUrl: string;
  };
};

export async function createTransaction(params: {
  sourceAddress?: string;
  destinationAddress: string;
  amount?: number;
  feeAddress?: string;
  feeIncluded?: false;
  currencyHash?: string;
  originalCurrencyHash?: string;
  inputMap?: Map<string, number>;
  wallet?: Wallet;
}): Promise<Transaction> {
  const {
    sourceAddress,
    destinationAddress,
    amount,
    currencyHash,
    feeAddress,
    feeIncluded,
    originalCurrencyHash,
    inputMap,
    wallet,
  } = params;
  const cotiWallet = wallet;
  const fullNodeApiUrl = cotiWallet.getFullNode();
  const network = cotiWallet.getNetwork();
  let newInputMap: Map<string, number>;
  if (!inputMap) {
    newInputMap = new Map();
    newInputMap.set(sourceAddress, amount);
  } else {
    newInputMap = inputMap;
  }

  const [hardForkError, hardFork] = await exec(
    nodeUtils.isNodeSupportMultiCurrencyApis(network, fullNodeApiUrl),
  );
  if (hardForkError) {
    logger.warn(hardForkError);
    logger.warn(
      `hardFork method doesnt exist on fullnode ${cotiWallet.getFullNode()}`,
    );
  }

  const baseTransactionObject = {
    wallet: cotiWallet,
    inputMap: newInputMap,
    description: 'transfer',
    feeAddress,
    destinationAddress,
    feeIncluded,
  };
  const hardForkResult = hardFork || HardForks.SINGLE_CURRENCY;
  if (hardFork === HardForks.MULTI_CURRENCY) {
    Object.assign(baseTransactionObject, {
      currencyHash,
      hardFork: hardForkResult,
      originalCurrencyHash,
    });
  }

  const newTransaction = await transactionUtils.createTransaction(
    baseTransactionObject,
  );

  await newTransaction.signTransaction(cotiWallet);

  return newTransaction;
}

export async function sendTransaction(
  transaction: Transaction,
  wallet: Wallet,
): Promise<void> {
  const cotiWallet = wallet;
  await nodeUtils.sendTransaction(
    transaction,
    cotiWallet.getNetwork(),
    cotiWallet.getFullNode(),
  );
}

export async function getNodeHashFromUrl(
  configService: ConfigService,
  url: string,
): Promise<string> {
  const nodeManagerUrl = configService.get<string>('NODE_MANAGER');
  let nodeHash: string;
  const nodeMap = await getNodes(nodeManagerUrl);

  for (const [hash, nodeObject] of Object.entries(nodeMap)) {
    if (nodeObject && nodeObject.webServerUrl === url) {
      nodeHash = hash;
      break;
    }
  }

  return nodeHash;
}

export async function getNodes(nodeManagerUrl: string): Promise<NodeResponse> {
  try {
    const response = await axios.get(`${nodeManagerUrl}/nodes`);
    if (axios.isAxiosError(response)) {
      throw response.data;
    }

    return response?.data?.multipleNodeMaps?.FullNode;
  } catch (error) {
    throw error;
  }
}
