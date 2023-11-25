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
    /*
     * if (!options.config?.templateCode) {
     *   throw new Error('未获取到短息模板code，请重新配置！');
     * }
     * const params = new $Dysmsapi20170525.SendSmsRequest({
     *   // 接收短信的手机号码
     *   phoneNumbers: options.to,
     *   // 短信签名名称
     *   signName: options.config?.signName,
     *   // 短信模板CODE
     *   templateCode: options.config?.templateCode,
     *   // 短信模板变量对应的实际值
     *   templateParam: options.config?.templateParam,
     *   outId: options.id,
     * });
     */

    /*
     * const smsResponse = await this.aliSmsClient.sendSms(params);
     * if (smsResponse.body.code === 'OK') {
     *   return {
     *     id: smsResponse.body.bizId,
     *     date: new Date().toISOString(),
     *   };
     * } else {
     *   return {
     *     id: undefined,
     *     date: new Date().toISOString(),
     *   };
     * }
     */
    return null;
  }
}
