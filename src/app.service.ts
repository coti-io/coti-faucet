import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { EntityManager, getManager } from 'typeorm';
import { Wallet } from '@coti-io/crypto';
import { getCurrencyHashBySymbol } from '@coti-io/crypto/dist/utils/utils';
import { ConfigService } from '@nestjs/config';
import { GetCotiReqDto, GetCotiResDto } from './dtos/faucet.dto';
import { exec } from './utils/promise-helper';
import {
  FaucetRequestEntity,
  getLatestFaucetRequest,
  getWalletHashEntity,
  isCurrencyHashValid,
  SupportedCurrenciesEntity,
  WalletHashesEntity,
} from './entities';
import { createTransaction, sendTransaction } from './utils/helpers';
import moment from 'moment';
import { TablesNames } from './utils/table-names.enum';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger('AppService');
  private wallet: Wallet;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const fullnode = this.configService.get<string>('FULL_NODE');
    const trustScoreNode = this.configService.get<string>('TRUST_SCORE_NODE');
    const seed = this.configService.get<string>('WALLET_SEED').slice(0, 64);
    try {
      this.wallet = new Wallet({ seed, fullnode, trustScoreNode });
      const poolAddress = await this.wallet.generateAddressByIndex(0);
      await this.wallet.loadAddresses([poolAddress]);
      this.logger.debug('wallet has loaded successfully');
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getCoti(body: GetCotiReqDto): Promise<GetCotiResDto> {
    const manager = getManager();
    try {
      const { walletHash, address, amount, currencyHash } = body;
      const validCurrency = await validateCurrencyHashAndGetWalletHash(
        manager,
        currencyHash,
        walletHash,
      );
      return await manager.transaction(async (transactionManager) => {
        const [lockedWalletHashEntityError, lockedWalletHashEntity] =
          await exec(getWalletHashEntity(transactionManager, walletHash, true));
        if (lockedWalletHashEntityError) throw lockedWalletHashEntityError;

        const [latestRequestError, latestRequest] = await exec(
          getLatestFaucetRequest(
            transactionManager,
            lockedWalletHashEntity.id,
            validCurrency.id,
          ),
        );
        if (latestRequestError) throw latestRequestError;

        await validateRequest(latestRequest);
        const newFaucetRequest = transactionManager
          .getRepository<FaucetRequestEntity>(TablesNames.FAUCET_REQUEST)
          .create({
            walletHashId: lockedWalletHashEntity.id,
            currencyId: validCurrency.id,
            lastRequestTime: new Date(),
          });

        return createAndSendTx({
          wallet: this.wallet,
          address,
          amount,
          currencyHash,
          newFaucetRequest,
          transactionManager,
        });
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}

export async function createAndSendTx(params: {
  wallet: Wallet;
  address: string;
  currencyHash: string;
  amount: number;
  newFaucetRequest: FaucetRequestEntity;
  transactionManager: EntityManager;
}): Promise<GetCotiResDto> {
  const {
    wallet,
    address,
    amount,
    currencyHash,
    newFaucetRequest,
    transactionManager,
  } = params;
  const nativeCurrencyHash = getCurrencyHashBySymbol('COTI');
  const poolAddress = await wallet.getAddressByIndex(0);
  const poolAddressHex = poolAddress.getAddressHex();

  // create transaction
  const tx = await createTransaction({
    sourceAddress: poolAddressHex,
    destinationAddress: address,
    amount,
    feeAddress: poolAddressHex,
    feeIncluded: false,
    currencyHash,
    originalCurrencyHash: nativeCurrencyHash,
    inputMap: null,
    wallet,
  });

  // save/update faucet action
  if (newFaucetRequest) {
    await transactionManager.save(newFaucetRequest);
  }

  // send transaction
  const [error] = await exec(sendTransaction(tx, wallet));
  if (error) throw error;

  return { txHash: tx.getHash() };
}

export async function validateRequest(latestRequest: FaucetRequestEntity) {
  if (latestRequest) {
    const hoursDiff = moment().diff(
      moment(latestRequest.lastRequestTime),
      'hours',
    );

    if (hoursDiff < 24) {
      throw new BadRequestException(
        'request from faucet is available once a day',
      );
    }
  }
}

export async function validateCurrencyHashAndGetWalletHash(
  manager: EntityManager,
  currencyHash: string,
  walletHash: string,
): Promise<SupportedCurrenciesEntity> {
  try {
    const [validCurrencyError, validCurrency] = await exec(
      isCurrencyHashValid(manager, currencyHash),
    );
    if (validCurrencyError) throw validCurrencyError;

    const [walletHashEntityError, walletHashEntity] = await exec(
      getWalletHashEntity(manager, walletHash, false),
    );
    if (walletHashEntityError) throw walletHashEntityError;

    if (!walletHashEntity) {
      const newWalletHashEntity = manager
        .getRepository<WalletHashesEntity>(TablesNames.WALLETHASHES)
        .create({
          walletHash,
        });
      const [saveError] = await exec(manager.save(newWalletHashEntity));
      if (saveError) throw saveError;
    }
    return validCurrency;
  } catch (e) {
    throw e;
  }
}
