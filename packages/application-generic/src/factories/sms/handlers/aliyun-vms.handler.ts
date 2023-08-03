import { AliyunVmsProvider } from '@novu/aliyun-vms';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { BaseSmsHandler } from './base.handler';

export class AliyunVmsHandler extends BaseSmsHandler {
  constructor() {
    super('aliyun-vms', ChannelTypeEnum.SMS);
  }
  buildProvider(credentials: ICredentials) {
    this.provider = new AliyunVmsProvider({
      accessKeyId: credentials.apiKey,
      accessKeySecret: credentials.secretKey,
      endpoint: credentials.baseUrl,
      httpProxy: credentials.httpProxy,
      httpsProxy: credentials.httpsProxy,
    });
  }
}
