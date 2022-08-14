import { IsHexadecimal, IsNotEmpty, IsNumber } from 'class-validator';

export class GetCotiReqDto {
  @IsHexadecimal()
  @IsNotEmpty()
  walletHash: string;

  @IsHexadecimal()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsHexadecimal()
  @IsNotEmpty()
  currencyHash: string;
}

export class GetCotiResDto {
  txHash: string;
}
