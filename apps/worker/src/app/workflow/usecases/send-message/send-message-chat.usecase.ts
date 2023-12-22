import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ModuleRef } from '@nestjs/core';

import {
  NotificationStepEntity,
  SubscriberRepository,
  MessageRepository,
  MessageEntity,
  IntegrationEntity,
  IChannelSettings,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  LogCodeEnum,
  ChatProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';
import {
  InstrumentUsecase,
  DetailEnum,
  CreateExecutionDetailsCommand,
  CompileTemplate,
  CompileTemplateCommand,
  ChatFactory,
  SelectIntegration,
  GetNovuProviderCredentials,
  SelectVariant,
  ExecutionLogQueueService,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils';

const LOG_CONTEXT = 'SendMessageChat';

@Injectable()
export class SendMessageChat extends SendMessageBase {
  channelType = ChannelTypeEnum.CHAT;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected executionLogQueueService: ExecutionLogQueueService,
    protected moduleRef: ModuleRef
  ) {
    super(
      messageRepository,
      createLogUsecase,
      executionLogQueueService,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials,
      selectVariant,
      moduleRef
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending Chat',
    });
    const step: NotificationStepEntity = command.step;
    if (!step?.template) throw new PlatformException('Chat channel template not found');

    const { subscriber } = command.compileContext;
    await this.initiateTranslations(command.environmentId, command.organizationId, subscriber.locale);

    const template = await this.processVariants(command);

    if (template) {
      step.template = template;
    }

    let content = '';

    try {
      content = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          template: step.template.content as string,
          data: this.getCompilePayload(command.compileContext),
        })
      );
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    const chatChannels =
      subscriber.channels?.filter((chan) =>
        Object.values(ChatProviderIdEnum).includes(chan.providerId as ChatProviderIdEnum)
      ) || [];

    if (chatChannels.length === 0) {
      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        }),
        command.organizationId
      );

      return;
    }

    let allFailed = true;
    for (const channel of chatChannels) {
      try {
        await this.sendChannelMessage(command, channel, step, content);
        allFailed = false;
      } catch (e) {
        /*
         * Do nothing, one chat channel failed, perhaps another one succeeds
         * The failed message has been created
         */
        Logger.error(e, `Sending chat message to the chat channel ${channel.providerId} failed`, LOG_CONTEXT);
      }
    }

    if (allFailed) {
      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.CHAT_ALL_CHANNELS_FAILED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        }),
        command.organizationId
      );
    }
  }

  private async sendChannelMessage(
    command: SendMessageCommand,
    subscriberChannel: IChannelSettings,
    chatChannel: NotificationStepEntity,
    content: string
  ) {
    const integration = await this.getIntegration({
      id: subscriberChannel._integrationId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      providerId: subscriberChannel.providerId,
      channelType: ChannelTypeEnum.CHAT,
      userId: command.userId,
      filterData: {
        tenant: command.job.tenant,
      },
    });

    const chatWebhookUrl = command.payload.webhookUrl || subscriberChannel.credentials?.webhookUrl;
    const channelSpecification = subscriberChannel.credentials?.channel;

    if (!chatWebhookUrl) {
      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.CHAT_WEBHOOK_URL_MISSING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: `webhookUrl for integrationId: ${subscriberChannel?._integrationId} is missing`,
          }),
        }),
        command.organizationId
      );
    }

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: chatChannel.template?._id,
      channel: ChannelTypeEnum.CHAT,
      transactionId: command.transactionId,
      chatWebhookUrl: chatWebhookUrl,
      content: this.storeContent() ? content : null,
      providerId: subscriberChannel.providerId,
      _jobId: command.jobId,
    });

    if (!integration) {
      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: `Integration with integrationId: ${subscriberChannel?._integrationId} is either deleted or not active`,
          }),
        }),
        command.organizationId
      );

      return;
    }

    await this.sendSelectedIntegrationExecution(command.job, integration);

    const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
    await this.executionLogQueueService.add(
      metadata._id,
      CreateExecutionDetailsCommand.create({
        ...metadata,
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: this.storeContent() ? JSON.stringify(content) : null,
      }),
      command.organizationId
    );

    if (chatWebhookUrl && integration) {
      await this.sendMessage(chatWebhookUrl, integration, content, message, command, channelSpecification);

      return;
    }

    await this.sendErrors(chatWebhookUrl, integration, message, command);
  }

  private async sendErrors(
    chatWebhookUrl: string,
    integration: IntegrationEntity,
    message: MessageEntity,
    command: SendMessageCommand
  ) {
    if (!chatWebhookUrl) {
      await this.messageRepository.updateMessageStatus(
        command.environmentId,
        message._id,
        'warning',
        null,
        'no_subscriber_chat_channel_id',
        'Subscriber does not have active chat channel id'
      );

      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.CHAT_WEBHOOK_URL_MISSING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: `webhookUrl for integrationId: ${integration?.identifier} is missing`,
          }),
        }),
        command.organizationId
      );

      return;
    }
    if (!integration) {
      await this.sendErrorStatus(
        message,
        'warning',
        'chat_missing_integration_error',
        'Subscriber does not have an active chat integration',
        command,
        LogCodeEnum.MISSING_CHAT_INTEGRATION
      );
      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: 'Integration is either deleted or not active',
          }),
        }),
        command.organizationId
      );

      return;
    }
  }

  private async sendMessage(
    chatWebhookUrl: string,
    integration: IntegrationEntity,
    content: string,
    message: MessageEntity,
    command: SendMessageCommand,
    channelSpecification?: string | undefined
  ) {
    try {
      const chatFactory = new ChatFactory();
      const chatHandler = chatFactory.getHandler(integration);
      if (!chatHandler) {
        throw new PlatformException(`Chat handler for provider ${integration.providerId} is  not found`);
      }

      const result = await chatHandler.send({
        webhookUrl: chatWebhookUrl,
        channel: channelSpecification,
        content,
      });

      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.MESSAGE_SENT,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(result),
        }),
        command.organizationId
      );
    } catch (e) {
      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_chat_error',
        e.message || e.name || 'Un-expect CHAT provider error',
        command,
        LogCodeEnum.CHAT_ERROR,
        e
      );

      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.PROVIDER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(e),
        }),
        command.organizationId
      );
    }
  }
}
