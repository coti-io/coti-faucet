import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { getManager } from 'typeorm';
import { Wallet } from '@coti-io/crypto';
import { getCurrencyHashBySymbol } from '@coti-io/crypto/dist/utils/utils';
import { ConfigService } from '@nestjs/config';
import { GetCotiReqDto, GetCotiResDto } from './dtos/faucet.dto';
import { exec } from './utils/promise-helper';
import {
  FaucetRequestEntity,
  isCurrencyHashValid,
  isWalletHashValid,
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
    const trustScoreNode = this.configService.get<string>('TRUST_SCORE');
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
    const nativeCurrencyHash = getCurrencyHashBySymbol('COTI');
    try {
      return await manager.transaction(async (transactionManager) => {
        const { walletHash, address, amount, currencyHash } = body;
        let newFaucetRequest;

        const [validCurrencyError, validCurrency] = await exec(
          isCurrencyHashValid(transactionManager, currencyHash),
        );
        if (validCurrencyError) throw validCurrencyError;

        const [validWalletHashError, validWalletHash] = await exec(
          isWalletHashValid(transactionManager, walletHash, validCurrency.id),
        );
        if (validWalletHashError) throw validWalletHashError;

        if (validWalletHash) {
          const hoursDiff = moment().diff(
            moment(validWalletHash.lastRequestTime),
            'hours',
          );

          if (hoursDiff < 24) {
            throw new BadRequestException(
              'request from faucet is available once a day',
            );
          }
        } else {
          newFaucetRequest = transactionManager
            .getRepository<FaucetRequestEntity>(TablesNames.FAUCET_REQUEST)
            .create({
              walletHash,
              currencyId: validCurrency.id,
              lastRequestTime: new Date(),
            });
        }

        const poolAddress = await this.wallet.getAddressByIndex(0);
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
          wallet: this.wallet,
        });

        // save/update faucet action
        if (newFaucetRequest) {
          await transactionManager.save(newFaucetRequest);
        } else {
          await transactionManager
            .getRepository<FaucetRequestEntity>(TablesNames.FAUCET_REQUEST)
            .update(
              { id: validWalletHash.id },
              { lastRequestTime: new Date() },
            );
        }

        // send transaction
        const [error] = await exec(sendTransaction(tx, this.wallet));
        if (error) throw error;

        return { txHash: tx.getHash() };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
