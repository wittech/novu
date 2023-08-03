import { AliyunSmsProvider } from '@novu/aliyun-sms';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class AliyunSmsHandler extends BaseSmsHandler {
  constructor() {
    super('aliyun-sms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new AliyunSmsProvider({
      accessKeyId: credentials.apiKey,
      accessKeySecret: credentials.secretKey,
      endpoint: credentials.baseUrl,
      httpProxy: credentials.httpProxy,
      httpsProxy: credentials.httpsProxy,
    });
  }
}
