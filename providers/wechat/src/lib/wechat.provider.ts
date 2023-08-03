import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios from 'axios';

export class WechatProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'wechat';
  private axiosInstance = axios.create();
  private appId: string;
  private secret: string;
  private httpProxy?: string;
  private httpsProxy?: string;

  constructor(
    private config: {
      appId: string;
      secret: string;
      httpProxy?: string;
      httpsProxy?: string;
    }
  ) {
    this.appId = config.appId;
    this.secret = config.secret;
    this.httpProxy = config.httpProxy;
    this.httpsProxy = config.httpsProxy;
  }

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.post(data.webhookUrl, {
      text: data.content,
    });

    return {
      id: response.headers['x-slack-req-id'],
      date: new Date().toISOString(),
    };
  }
}
