import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios from 'axios';

export class OpenimProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'openim';
  private axiosInstance = axios.create();
  private endpoint: string;
  constructor(
    private config: {
      endpoint: string;
    }
  ) {
    this.endpoint = config.endpoint;
  }

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    const response = await this.axiosInstance.post(data.webhookUrl, {
      text: data.content,
      blocks: data.blocks,
    });

    return {
      id: response.headers['x-slack-req-id'],
      date: new Date().toISOString(),
    };
  }
}
