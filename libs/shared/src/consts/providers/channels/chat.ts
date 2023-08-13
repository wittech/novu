import { IConfigCredentials, IProviderConfig } from '../provider.interface';
import { openimConfig, slackConfig, wechatConfig } from '../credentials';
import { ChatProviderIdEnum } from '../provider.enum';

import { ChannelTypeEnum } from '../../../types';

export const chatProviders: IProviderConfig[] = [
  {
    id: ChatProviderIdEnum.Slack,
    displayName: 'Slack',
    channel: ChannelTypeEnum.CHAT,
    credentials: slackConfig,
    docReference: 'https://docs.novu.co/channels/chat/slack',
    logoFileName: { light: 'slack.svg', dark: 'slack.svg' },
  },
  {
    id: ChatProviderIdEnum.Discord,
    displayName: 'Discord',
    channel: ChannelTypeEnum.CHAT,
    credentials: [] as IConfigCredentials[],
    docReference: 'https://docs.novu.co/channels/chat/discord',
    logoFileName: { light: 'discord.svg', dark: 'discord.svg' },
  },
  {
    id: ChatProviderIdEnum.MsTeams,
    displayName: 'MSTeams',
    channel: ChannelTypeEnum.CHAT,
    credentials: [] as IConfigCredentials[],
    docReference: 'https://docs.novu.co/channels/chat/msteams',
    logoFileName: { light: 'msteams.svg', dark: 'msteams.svg' },
  },
  {
    id: ChatProviderIdEnum.Mattermost,
    displayName: 'Mattermost',
    channel: ChannelTypeEnum.CHAT,
    credentials: [] as IConfigCredentials[],
    docReference: 'https://developers.mattermost.com/integrate/webhooks/incoming/',
    logoFileName: { light: 'mattermost.svg', dark: 'mattermost.svg' },
  },
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
