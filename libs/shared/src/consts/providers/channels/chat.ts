import { IConfigCredentials, IProviderConfig } from '../provider.interface';
import { grafanaOnCallConfig, slackConfig, getstreamConfig, wechatConfig, openimConfig } from '../credentials';

import { ChatProviderIdEnum } from '../provider.enum';
import { ChannelTypeEnum } from '../../../types';
import { UTM_CAMPAIGN_QUERY_PARAM } from '../../../ui';

export const chatProviders: IProviderConfig[] = [
  /*
   * {
   *   id: ChatProviderIdEnum.Slack,
   *   displayName: 'Slack',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: slackConfig,
   *   docReference: 'https://docs.novu.co/channels-and-providers/chat/slack',
   *   logoFileName: { light: 'slack.svg', dark: 'slack.svg' },
   * },
   * {
   *   id: ChatProviderIdEnum.Discord,
   *   displayName: 'Discord',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: [] as IConfigCredentials[],
   *   docReference: 'https://docs.novu.co/channels-and-providers/chat/discord',
   *   logoFileName: { light: 'discord.svg', dark: 'discord.svg' },
   * },
   * {
   *   id: ChatProviderIdEnum.GrafanaOnCall,
   *   displayName: 'Grafana On Call Webhook',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: grafanaOnCallConfig,
   *   docReference: 'https://grafana.com/docs/oncall/latest/integrations/webhook/',
   *   logoFileName: { light: 'grafana-on-call.png', dark: 'grafana-on-call.png' },
   * },
   * {
   *   id: ChatProviderIdEnum.MsTeams,
   *   displayName: 'MSTeams',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: [] as IConfigCredentials[],
   *   docReference: 'https://docs.novu.co/channels-and-providers/chat/ms-teams',
   *   logoFileName: { light: 'msteams.svg', dark: 'msteams.svg' },
   * },
   * {
   *   id: ChatProviderIdEnum.Mattermost,
   *   displayName: 'Mattermost',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: [] as IConfigCredentials[],
   *   docReference: 'https://developers.mattermost.com/integrate/webhooks/incoming/',
   *   logoFileName: { light: 'mattermost.svg', dark: 'mattermost.svg' },
   * },
   * {
   *   id: ChatProviderIdEnum.Ryver,
   *   displayName: 'Ryver',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: [] as IConfigCredentials[],
   *   docReference: 'https://api.ryver.com/ryvrest_api_examples.html#create-chat-message',
   *   logoFileName: { light: 'ryver.png', dark: 'ryver.png' },
   * },
   * {
   *   id: ChatProviderIdEnum.Zulip,
   *   displayName: 'Zulip',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: [] as IConfigCredentials[],
   *   docReference: 'https://docs.novu.co/channels-and-providers/chat/zulip',
   *   logoFileName: { light: 'zulip.svg', dark: 'zulip.svg' },
   * },
   * {
   *   id: ChatProviderIdEnum.GetStream,
   *   displayName: 'GetStream',
   *   channel: ChannelTypeEnum.CHAT,
   *   credentials: getstreamConfig,
   *   docReference: 'https://getstream.io/chat/docs/node/?language=javascript',
   *   logoFileName: { light: 'getstream.svg', dark: 'getstream.svg' },
   * },
   */
  {
    id: ChatProviderIdEnum.Wechat,
    displayName: 'Wechat',
    channel: ChannelTypeEnum.CHAT,
    credentials: wechatConfig,
    docReference: 'https://developers.weixin.qq.com/doc/offiaccount/Getting_Started/Overview.html',
    logoFileName: { light: 'wechat.svg', dark: 'wechat.svg' },
  },
  {
    id: ChatProviderIdEnum.Openim,
    displayName: 'Openim',
    channel: ChannelTypeEnum.CHAT,
    credentials: openimConfig,
    docReference: 'https://doc.rentsoft.cn/',
    logoFileName: { light: 'openim.png', dark: 'openim.png' },
  },
];
