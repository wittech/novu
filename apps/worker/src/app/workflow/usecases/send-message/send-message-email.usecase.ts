import { Injectable } from '@nestjs/common';
import {
  MessageRepository,
  NotificationStepEntity,
  SubscriberRepository,
  EnvironmentRepository,
  IntegrationEntity,
  MessageEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IAttachmentOptions,
  IEmailOptions,
  LogCodeEnum,
} from '@novu/shared';
import * as Sentry from '@sentry/node';
import {
  InstrumentUsecase,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  SelectIntegration,
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  MailFactory,
  GetNovuProviderCredentials,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils';

@Injectable()
export class SendMessageEmail extends SendMessageBase {
  channelType = ChannelTypeEnum.EMAIL;

  constructor(
    protected environmentRepository: EnvironmentRepository,
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials
  ) {
    super(
      messageRepository,
      createLogUsecase,
      createExecutionDetails,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const subscriber = await this.getSubscriberBySubscriberId({
      subscriberId: command.subscriberId,
      _environmentId: command.environmentId,
    });
    if (!subscriber) throw new PlatformException(`Subscriber ${command.subscriberId} not found`);

    let integration: IntegrationEntity | undefined = undefined;

    const overrideSelectedIntegration = command.overrides?.email?.integrationIdentifier;
    try {
      integration = await this.getIntegration({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channelType: ChannelTypeEnum.EMAIL,
        userId: command.userId,
        identifier: overrideSelectedIntegration as string,
      });
    } catch (e) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.LIMIT_PASSED_NOVU_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          raw: JSON.stringify({ message: e.message }),
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    const emailChannel: NotificationStepEntity = command.step;
    if (!emailChannel) throw new PlatformException('Email channel step not found');
    if (!emailChannel.template) throw new PlatformException('Email channel template not found');

    const email = command.payload.email || subscriber.email;

    Sentry.addBreadcrumb({
      message: 'Sending Email',
    });

    if (!integration) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          ...(overrideSelectedIntegration
            ? {
                raw: JSON.stringify({
                  integrationIdentifier: overrideSelectedIntegration,
                }),
              }
            : {}),
        })
      );

      return;
    }

    await this.sendSelectedIntegrationExecution(command.job, integration);

    const overrides: Record<string, any> = Object.assign(
      {},
      command.overrides.email || {},
      command.overrides[integration?.providerId] || {}
    );

    let html;
    let subject = '';
    let content;

    const payload = {
      subject: emailChannel.template.subject || '',
      preheader: emailChannel.template.preheader,
      content: emailChannel.template.content,
      layoutId: emailChannel.template._layoutId,
      contentType: emailChannel.template.contentType ? emailChannel.template.contentType : 'editor',
      payload: {
        ...command.payload,
        step: {
          digest: !!command.events?.length,
          events: command.events,
          total_count: command.events?.length,
        },
        subscriber,
      },
    };

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: emailChannel.template._id,
      subject,
      channel: ChannelTypeEnum.EMAIL,
      transactionId: command.transactionId,
      email,
      providerId: integration?.providerId,
      payload: messagePayload,
      overrides,
      templateIdentifier: command.identifier,
      _jobId: command.jobId,
    });

    let replyToAddress: string | undefined;
    if (command.step.replyCallback?.active) {
      const replyTo = await this.getReplyTo(command, message._id);

      if (replyTo) {
        replyToAddress = replyTo;

        if (payload.payload.step) {
          payload.payload.step.reply_to_address = replyTo;
        }
      }
    }

    try {
      ({ html, content, subject } = await this.compileEmailTemplateUsecase.execute(
        CompileEmailTemplateCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          ...payload,
        })
      ));

      if (this.storeContent()) {
        await this.messageRepository.update(
          {
            _id: message._id,
            _environmentId: command.environmentId,
          },
          {
            $set: {
              subject,
              content,
            },
          }
        );
      }
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: this.storeContent() ? JSON.stringify(payload) : null,
      })
    );

    const attachments = (<IAttachmentOptions[]>command.payload.attachments)?.map(
      (attachment) =>
        <IAttachmentOptions>{
          file: attachment.file,
          mime: attachment.mime,
          name: attachment.name,
          channels: attachment.channels,
        }
    );

    const mailData: IEmailOptions = createMailData(
      {
        to: email,
        subject,
        html,
        from: integration?.credentials.from || 'no-reply@novu.co',
        attachments,
        id: message._id,
        replyTo: replyToAddress,
        notificationDetails: {
          transactionId: command.transactionId,
          workflowIdentifier: command.identifier,
          subscriberId: subscriber.subscriberId,
        },
      },
      overrides || {}
    );

    if (command.overrides?.email?.replyTo) {
      mailData.replyTo = command.overrides?.email?.replyTo as string;
    }

    if (integration.providerId === EmailProviderIdEnum.EmailWebhook) {
      mailData.payloadDetails = payload;
    }

    if (email && integration) {
      await this.sendMessage(
        integration,
        mailData,
        message,
        command,
        overrides?.senderName || emailChannel.template.senderName
      );

      return;
    }
    await this.sendErrors(email, integration, message, command);
  }

  private async getReplyTo(command: SendMessageCommand, messageId: string): Promise<string | null> {
    if (!command.step.replyCallback?.url) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: messageId,
          detail: DetailEnum.REPLY_CALLBACK_MISSING_REPLAY_CALLBACK_URL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.WARNING,
          isTest: false,
          isRetry: false,
        })
      );

      return null;
    }

    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });
    if (!environment) {
      throw new PlatformException(`Environment ${command.environmentId} is not found`);
    }

    if (environment.dns?.mxRecordConfigured && environment.dns?.inboundParseDomain) {
      return getReplyToAddress(command.transactionId, environment._id, environment?.dns?.inboundParseDomain);
    } else {
      const detailEnum =
        !environment.dns?.mxRecordConfigured && !environment.dns?.inboundParseDomain
          ? DetailEnum.REPLY_CALLBACK_NOT_CONFIGURATION
          : !environment.dns?.mxRecordConfigured
          ? DetailEnum.REPLY_CALLBACK_MISSING_MX_RECORD_CONFIGURATION
          : DetailEnum.REPLY_CALLBACK_MISSING_MX_ROUTE_DOMAIN_CONFIGURATION;

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: messageId,
          detail: detailEnum,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.WARNING,
          isTest: false,
          isRetry: false,
        })
      );

      return null;
    }
  }

  private async sendErrors(email, integration, message: MessageEntity, command: SendMessageCommand) {
    const errorMessage = 'Subscriber does not have an';
    const status = 'warning';
    const errorId = 'mail_unexpected_error';

    if (!email) {
      const mailErrorMessage = `${errorMessage} email address`;

      await this.sendErrorStatus(
        message,
        status,
        errorId,
        mailErrorMessage,
        command,
        LogCodeEnum.SUBSCRIBER_MISSING_EMAIL
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_CHANNEL_DETAILS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }
    if (!integration) {
      const integrationError = `${errorMessage} active email integration not found`;

      await this.sendErrorStatus(
        message,
        status,
        errorId,
        integrationError,
        command,
        LogCodeEnum.MISSING_EMAIL_INTEGRATION
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }
  }

  private async sendMessage(
    integration: IntegrationEntity,
    mailData: IEmailOptions,
    message: MessageEntity,
    command: SendMessageCommand,
    senderName?: string
  ) {
    const mailFactory = new MailFactory();
    const mailHandler = mailFactory.getHandler(this.buildFactoryIntegration(integration, senderName), mailData.from);

    try {
      const result = await mailHandler.send(mailData);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.MESSAGE_SENT,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(result),
        })
      );

      if (!result?.id) {
        return;
      }

      await this.messageRepository.update(
        { _environmentId: command.environmentId, _id: message._id },
        {
          $set: {
            identifier: result.id,
          },
        }
      );
    } catch (error) {
      await this.sendErrorStatus(
        message,
        'error',
        'mail_unexpected_error',
        'Error while sending email with provider',
        command,
        LogCodeEnum.MAIL_PROVIDER_DELIVERY_ERROR,
        error
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.PROVIDER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(error),
        })
      );

      return;
    }
  }

  public buildFactoryIntegration(integration: IntegrationEntity, senderName?: string) {
    return {
      ...integration,
      credentials: {
        ...integration.credentials,
        senderName: senderName && senderName.length > 0 ? senderName : integration.credentials.senderName,
      },
      providerId: integration.providerId,
    };
  }
}

export const createMailData = (options: IEmailOptions, overrides: Record<string, any>): IEmailOptions => {
  const filterDuplicate = (prev: string[], current: string) => (prev.includes(current) ? prev : [...prev, current]);

  let to = Array.isArray(options.to) ? options.to : [options.to];
  to = [...to, ...(overrides?.to || [])];
  to = to.reduce(filterDuplicate, []);
  const ipPoolName = overrides?.ipPoolName ? { ipPoolName: overrides?.ipPoolName } : {};

  return {
    ...options,
    to,
    from: overrides?.from || options.from,
    text: overrides?.text,
    cc: overrides?.cc || [],
    bcc: overrides?.bcc || [],
    ...ipPoolName,
  };
};

export function getReplyToAddress(transactionId: string, environmentId: string, inboundParseDomain: string) {
  const userNamePrefix = 'parse';
  const userNameDelimiter = '-nv-e=';

  return `${userNamePrefix}+${transactionId}${userNameDelimiter}${environmentId}@${inboundParseDomain}`;
}
