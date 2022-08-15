import { Column, Entity, EntityManager, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { exec } from '../utils/promise-helper';
import { BadRequestException } from '@nestjs/common';
import { FaucetRequestEntity } from './faucet-request.entity';
import { TablesNames } from '../utils/table-names.enum';

@Entity(TablesNames.SUPPORTED_CURRENCIES)
export class SupportedCurrenciesEntity extends BaseEntity {
  @Column()
  currencyHash: string;

  @OneToOne(
    () => FaucetRequestEntity,
    (faucetRequestEntity) => faucetRequestEntity.supportedCurrency,
  )
  faucetRequest: FaucetRequestEntity;
}

export const isCurrencyHashValid = async (
  manager: EntityManager,
  currencyHash: string,
): Promise<SupportedCurrenciesEntity> => {
  const [validCurrencyError, validCurrency] = await exec(
    manager
      .getRepository<SupportedCurrenciesEntity>(
        TablesNames.SUPPORTED_CURRENCIES,
      )
      .createQueryBuilder(TablesNames.SUPPORTED_CURRENCIES)
      .where({ currencyHash: currencyHash })
      .getOne(),
  );

  if (validCurrencyError) throw validCurrencyError;

  if (!isCurrencyHashValid) {
    throw new BadRequestException('currencyHash is not supported');
  }

  return validCurrency;
};
