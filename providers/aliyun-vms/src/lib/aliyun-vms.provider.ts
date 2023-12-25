import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import Dyvmsapi20170525, * as $Dyvmsapi20170525 from '@alicloud/dyvmsapi20170525';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';

export class AliyunVmsProvider implements ISmsProvider {
  id = 'aliyun-vms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private aliVmsClient: Dyvmsapi20170525;

  constructor(
    private config: {
      accessKeyId: string;
      accessKeySecret: string;
      endpoint: string;
      httpProxy?: string;
      httpsProxy?: string;
    }
  ) {
    const vmsConfig = new $OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint,
      httpProxy: config.httpProxy,
      httpsProxy: config.httpsProxy,
    });
    this.aliVmsClient = new Dyvmsapi20170525(vmsConfig);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    /*
     * if (!options.config?.voiceCode) {
     *   throw new Error('未获取到语音模板code，请重新配置！');
     * }
     * const params = new $Dyvmsapi20170525.SingleCallByVoiceRequest({
     *   // 接收语音通知的号码
     *   calledNumber: options.to,
     *   // 语音通知文件的语音ID
     *   voiceCode: options.config?.voiceCode,
     *   // 预留给调用方使用的ID，最终会通过在回执消息中将此ID带回给调用方。
     *   outId: options.id,
     * });
     */

    /*
     * if (options.config?.calledShowNumber) {
     *   // 被叫显示号，若您使用的语音通知文件为公共模式外呼，则该参数值不填；若您使用的语音通知文件为专属模式外呼，则必须传入已购买的号码，仅支持一个号码；
     *   params.calledShowNumber = options.config?.calledShowNumber;
     * }
     */

    /*
     * if (options.config?.playTimes > 0) {
     *   // 语音文件的播放次数。取值范围：1~3
     *   params.playTimes = options.config?.playTimes;
     * }
     */

    /*
     * if (options.config?.volume >= 0) {
     *   // 语音文件播放的音量。取值范围：0~100，默认取值100。
     *   params.volume = options.config?.volume;
     * }
     */

    /*
     * if (options.config?.speed >= -500) {
     *   // 语速控制，取值范围：-500~500。
     *   params.speed = options.config?.speed;
     * }
     */

    /*
     * const smsResponse = await this.aliVmsClient.singleCallByVoice(params);
     * if (smsResponse.body.code === 'OK') {
     *   return {
     *     id: smsResponse.body.callId,
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
