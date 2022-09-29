import { IsHexadecimal, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class GetCotiReqDto {
  @IsHexadecimal()
  @IsNotEmpty()
  walletHash: string;

  @IsHexadecimal()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsHexadecimal()
  @IsNotEmpty()
  currencyHash: string;
}

export class GetCotiResDto {
  txHash: string;
}
