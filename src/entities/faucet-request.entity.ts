import { Column, Entity, EntityManager, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { exec } from '../utils/promise-helper';
import { SupportedCurrenciesEntity } from './supported-currencies';
import { TablesNames } from "../utils/table-names.enum";

@Entity(TablesNames.FAUCET_REQUEST)
export class FaucetRequestEntity extends BaseEntity {
  @Column()
  walletHash: string;

  @Column()
  currencyId: number;

  @Column()
  lastRequestTime: Date;

  @OneToOne(
    () => SupportedCurrenciesEntity,
    (supportedCurrenciesEntity) => supportedCurrenciesEntity.faucetRequest,
  )
  @JoinColumn({ name: 'currencyId' })
  supportedCurrenciesEntity: SupportedCurrenciesEntity;
}

export const isWalletHashValid = async (
  manager: EntityManager,
  walletHash: string,
  currencyId: number,
): Promise<FaucetRequestEntity> => {
  const [validWalletHashError, validWalletHash] = await exec(
    manager
      .getRepository<FaucetRequestEntity>(TablesNames.FAUCET_REQUEST)
      .createQueryBuilder(TablesNames.FAUCET_REQUEST)
      .where({ walletHash: walletHash })
      .andWhere({ currencyId: currencyId })
      .getOne(),
  );

  if (validWalletHashError) throw validWalletHashError;

  return validWalletHash;
};
