import {
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Redis from 'ioredis';

export class WechatProvider implements IChatProvider {
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  public id = 'wechat';
  private axiosInstance: AxiosInstance;
  private appId: string;
  private secret: string;
  private redisInstance: Redis;

  constructor(
    private config: {
      appId: string;
      secret: string;
      httpProxy?: string;
      httpsProxy?: string;
      redisInstance?: Redis | undefined;
    }
  ) {
    this.appId = config.appId;
    this.secret = config.secret;
    // 使用redis存储access_token，有效期为7200秒；
    this.redisInstance = config.redisInstance;

    if (config.httpsProxy) {
      this.axiosInstance = axios.create({
        proxy: false,
        httpsAgent: new HttpsProxyAgent(config.httpsProxy),
      });
    } else {
      this.axiosInstance = axios.create();
    }
  }

  async getStableAccessToken(): Promise<string> {
    const redisKey = `wechat_access_token:${this.appId}`;
    const token = await this.redisInstance.get(redisKey);
    if (token) {
      return token;
    }

    try {
      // 用stable_token接口，避免token在其他地方出现调用过一次后，原来旧的立即失效的问题；
      const { data }: any = await this.axiosInstance.post(
        'https://api.weixin.qq.com/cgi-bin/stable_token',
        {
          grant_type: 'client_credential',
          appid: this.appId,
          secret: this.secret,
        }
      );
      if (data.access_token) {
        //缓存到redis中，且设置自动过期时间；
        await this.redisInstance.setex(
          redisKey,
          data.expires_in,
          data.access_token
        );

        return data.access_token;
      } else {
        throw new Error('获取微信access_token错误' + data.errmsg);
      }
    } catch (e) {
      throw e;
    }
  }

  async sendMessage(data: IChatOptions): Promise<ISendMessageSuccessResponse> {
    const accessToken = await this.getStableAccessToken();
    if (accessToken) {
      const response: any = await this.axiosInstance.post(
        `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
        data.content
      );

      if (response.data.errcode === 0) {
        //错误码为0表示成功
        return {
          id: response.data.msgid,
          date: new Date().toISOString(),
        };
      }
    }

    return {
      id: undefined,
      date: new Date().toISOString(),
    };
  }
}
