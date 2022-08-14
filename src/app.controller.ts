import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthenticatedGuard } from './guards/auth.guard';
import { GetCotiReqDto, GetCotiResDto } from './dtos/faucet.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(new AuthenticatedGuard())
  @Post()
  getCoti(@Body() body: GetCotiReqDto): Promise<GetCotiResDto> {
    return this.appService.getCoti(body);
  }
}
