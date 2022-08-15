import { Column, Entity, EntityManager, OneToMany } from 'typeorm';
import { TablesNames } from '../utils/table-names.enum';
import { BaseEntity } from './base.entity';
import { FaucetRequestEntity } from './faucet-request.entity';
import { exec } from '../utils/promise-helper';

@Entity(TablesNames.WALLETHASHES)
export class WalletHashesEntity extends BaseEntity {
  @Column()
  walletHash: string;
  // ae2b227ab7e614b8734be1f03d1532e66bf6caf76accc02ca4da6e28
  @OneToMany(
    () => FaucetRequestEntity,
    (faucetRequestEntity) => faucetRequestEntity.walletHash,
  )
  faucetRequests: FaucetRequestEntity[];
}

export const getWalletHashEntity = async (
  manager: EntityManager,
  walletHash: string,
  withLock: boolean,
): Promise<WalletHashesEntity> => {
  let query = manager
    .getRepository<WalletHashesEntity>(TablesNames.WALLETHASHES)
    .createQueryBuilder(TablesNames.WALLETHASHES);
  if (withLock) {
    query = query.setLock('pessimistic_write');
  }

  query.where({ walletHash: walletHash });

  const [walletHashesEntityError, walletHashesEntity] = await exec(
    query.getOne(),
  );

  if (walletHashesEntityError) throw walletHashesEntityError;

  return walletHashesEntity;
};
