import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { WechatProvider } from '@novu/wechat';
import { getRedisInstance } from '../../../services/in-memory-provider/providers/redis-provider';

export class WechatHandler extends BaseChatHandler {
  constructor() {
    super('wechat', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new WechatProvider({
      appId: credentials.applicationId,
      secret: credentials.secretKey,
      httpProxy: credentials.httpProxy,
      httpsProxy: credentials.httpsProxy,
      redisInstance: getRedisInstance(),
    });
  }
}
