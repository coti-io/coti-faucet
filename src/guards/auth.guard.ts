import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FaucetSignature } from '@coti-io/crypto';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    // TODO Check if can get config service threw the constructor
    const signatureExpiration =
      Number(process.env.SIGNATURE_EXPIRATION_VALIDATION_IN_SECONDS as any) *
        1000 || 10000;
    const request = context.switchToHttp().getRequest();
    const { body } = request;
    const { walletHash, currencyHash, address, amount, timestamp, signature } =
      body;
    const signatureObj = new FaucetSignature(
      address,
      currencyHash,
      amount,
      timestamp,
      signature,
    );
    const isVerified = signatureObj.verify(walletHash);
    const isValid =
      parseFloat(body.timestamp) + signatureExpiration >= Date.now();
    if (isVerified && isValid) {
      delete body['timestamp'];
      return true;
    } else throw new UnauthorizedException();
  }
}
