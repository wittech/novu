import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { OpenimProvider } from '@novu/openim';

export class OpenimHandler extends BaseChatHandler {
  constructor() {
    super('openim', ChannelTypeEnum.CHAT);
  }

  buildProvider(credentials: ICredentials) {
    this.provider = new OpenimProvider({ endpoint: credentials.baseUrl });
  }
}
