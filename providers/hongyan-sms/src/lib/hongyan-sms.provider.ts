import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';
import queryString from 'query-string';
const crypto = require('crypto');

export class HongyanSmsProvider implements ISmsProvider {
  id = 'hongyan-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private msgSendPath = '/dubbo/openapi/message/send';
  private smsConfig: any = {};
  constructor(
    private config: {
      apiKey: string;
      secretKey: string;
      endpoint: string;
      httpProxy?: string;
      httpsProxy?: string;
    }
  ) {
    this.smsConfig.apiKey = config.apiKey;
    this.smsConfig.secretKey = config.secretKey;
    this.smsConfig.endpoint = config.endpoint;
    this.smsConfig.httpProxy = config.httpProxy;
    this.smsConfig.httpsProxy = config.httpsProxy;
  }

  async sign(timestamp: string, path: string, appSecret: string) {
    const params: { [key: string]: string } = {
      timestamp,
      path,
      version: '1.0.0',
    };
    const storedKeys = Object.keys(params)
      .filter((key) => !key.includes('sign'))
      .sort((a, b) => a.localeCompare(b))
      .map((key) => key + params[key]);
    const sign = storedKeys.join('').concat(appSecret);
    const md5DigestAsHex = crypto
      .createHash('md5')
      .update(sign)
      .digest('hex')
      .toUpperCase();

    return md5DigestAsHex;
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const timestamp = new Date().getTime().toString();
    const md5DigestAsHex = await this.sign(
      timestamp,
      this.msgSendPath,
      this.smsConfig.apiKey
    );
    const header = {
      timestamp: timestamp,
      appKey: this.smsConfig.apiKey,
      version: '1.0.0',
      clientId: '1',
      sign: md5DigestAsHex,
    };
    const msgParams = {
      resourceId: this.smsConfig.apiKey,
      mobile: options.to,
      content: options.content,
    };
    const { data } = await axios.post(
      `${this.smsConfig.endpoint}${this.msgSendPath}`,
      queryString.stringify(msgParams),
      {
        headers: header,
      }
    );

    if (data && data.code === 200) {
      return {
        id: options.id,
        date: new Date().toISOString(),
      };
    } else if (data) {
      throw new Error('发送短信失败，返回值：' + JSON.stringify(data));
    } else {
      throw new Error('发送短信失败，返回值非200');
    }
  }
}
