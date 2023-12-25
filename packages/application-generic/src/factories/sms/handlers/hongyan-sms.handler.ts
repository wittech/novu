import { HongyanSmsProvider } from '@novu/hongyan-sms';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class HongyanSmsHandler extends BaseSmsHandler {
  constructor() {
    super('hongyan-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new HongyanSmsProvider({
      appKey: credentials.appID,
      secretKey: credentials.secretKey,
      endpoint: credentials.baseUrl,
      httpProxy: credentials.httpProxy,
      httpsProxy: credentials.httpsProxy,
    });
  }
}
