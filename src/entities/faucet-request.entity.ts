import {
  Column,
  Entity,
  EntityManager,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { exec } from '../utils/promise-helper';
import { SupportedCurrenciesEntity } from './supported-currencies';
import { TablesNames } from '../utils/table-names.enum';
import { WalletHashesEntity } from './wallet-hashes.entity';

@Entity(TablesNames.FAUCET_REQUEST)
export class FaucetRequestEntity extends BaseEntity {
  @Column()
  walletHashId: number;

  @Column()
  currencyId: number;

  @Column()
  lastRequestTime: Date;

  @OneToOne(
    () => SupportedCurrenciesEntity,
    (supportedCurrenciesEntity) => supportedCurrenciesEntity.faucetRequest,
  )
  @JoinColumn({ name: 'currencyId' })
  supportedCurrency: SupportedCurrenciesEntity;

  @ManyToOne(
    () => WalletHashesEntity,
    (walletHashesEntity) => walletHashesEntity.faucetRequests,
  )
  @JoinColumn({ name: 'walletHashId' })
  walletHash: WalletHashesEntity;
}

export const getLatestFaucetRequest = async (
  manager: EntityManager,
  walletHashId: number,
  currencyId: number,
): Promise<FaucetRequestEntity> => {
  const [validWalletHashError, validWalletHash] = await exec(
    manager
      .getRepository<FaucetRequestEntity>(TablesNames.FAUCET_REQUEST)
      .createQueryBuilder(TablesNames.FAUCET_REQUEST)
      .where({ walletHashId: walletHashId })
      .andWhere({ currencyId: currencyId })
      .orderBy({ id: 'DESC' })
      .getOne(),
  );

  if (validWalletHashError) throw validWalletHashError;

  return validWalletHash;
};
