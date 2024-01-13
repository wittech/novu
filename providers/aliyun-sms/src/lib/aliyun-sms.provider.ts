import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import AliSmsClient, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import Dysmsapi20170525 from '@alicloud/dysmsapi20170525';

export class AliyunSmsProvider implements ISmsProvider {
  id = 'aliyun-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private aliSmsClient: AliSmsClient;

  constructor(
    private config: {
      accessKeyId: string;
      accessKeySecret: string;
      endpoint: string;
      httpProxy?: string;
      httpsProxy?: string;
    }
  ) {
    const smsConfig = new $OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint,
      httpProxy: config.httpProxy,
      httpsProxy: config.httpsProxy,
    });
    this.aliSmsClient = new Dysmsapi20170525(smsConfig);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    if (!options.payload?.templateCode) {
      throw new Error(
        '未获取到短信模板code，请重新配置！传入值：' + JSON.stringify(options)
      );
    }
    const params = new $Dysmsapi20170525.SendSmsRequest({
      // 接收短信的手机号码
      phoneNumbers: options.to,
      // 短信签名名称
      signName: options.payload?.signName,
      // 短信模板CODE
      templateCode: options.payload?.templateCode,
      // 短信模板变量对应的实际值
      templateParam: options.payload?.templateParam,
      outId: options.id,
    });

    const { body } = await this.aliSmsClient.sendSms(params);
    if (body && body.code === 'OK') {
      return {
        id: body.bizId,
        date: new Date().toISOString(),
      };
    } else if (body) {
      throw new Error('发送短信失败，返回值：' + JSON.stringify(body));
    } else {
      throw new Error('发送短信失败，返回值非200');
    }
  }
}
