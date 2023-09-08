import { Injectable } from '@nestjs/common';
import {
  DigestTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestRegularMetadata,
  IPreferenceChannels,
  StepTypeEnum,
} from '@novu/shared';
import {
  InstrumentUsecase,
  AnalyticsService,
  buildNotificationTemplateKey,
  buildSubscriberKey,
  CachedEntity,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  Instrument,
} from '@novu/application-generic';
import {
  JobEntity,
  SubscriberRepository,
  NotificationTemplateRepository,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';

import { SendMessageCommand } from './send-message.command';
import { SendMessageDelay } from './send-message-delay.usecase';
import { SendMessageEmail } from './send-message-email.usecase';
import { SendMessageSms } from './send-message-sms.usecase';
import { SendMessageInApp } from './send-message-in-app.usecase';
import { SendMessageChat } from './send-message-chat.usecase';
import { SendMessagePush } from './send-message-push.usecase';
import { Digest } from './digest';
import { PlatformException } from '../../../shared/utils';
import { MessageMatcher } from '../message-matcher';

@Injectable()
export class SendMessage {
  constructor(
    private sendMessageEmail: SendMessageEmail,
    private sendMessageSms: SendMessageSms,
    private sendMessageInApp: SendMessageInApp,
    private sendMessageChat: SendMessageChat,
    private sendMessagePush: SendMessagePush,
    private digest: Digest,
    private subscriberRepository: SubscriberRepository,
    private createExecutionDetails: CreateExecutionDetails,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private jobRepository: JobRepository,
    private sendMessageDelay: SendMessageDelay,
    private matchMessage: MessageMatcher,
    private analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const shouldRun = await this.filter(command);
    const preferred = await this.filterPreferredChannels(command.job);

    const stepType = command.step?.template?.type;

    if (!command.payload?.$on_boarding_trigger) {
      const usedFilters = shouldRun.conditions.reduce(MessageMatcher.sumFilters, {
        stepFilters: [],
        failedFilters: [],
        passedFilters: [],
      });

      const digest = command.job.digest;
      let timedInfo: any = {};

      if (digest && digest.type === DigestTypeEnum.TIMED && digest.timed) {
        timedInfo = {
          digestAtTime: digest.timed.atTime,
          digestWeekDays: digest.timed.weekDays,
          digestMonthDays: digest.timed.monthDays,
          digestOrdinal: digest.timed.ordinal,
          digestOrdinalValue: digest.timed.ordinalValue,
        };
      }

      this.analyticsService.track('Process Workflow Step - [Triggers]', command.userId, {
        _template: command.job._templateId,
        _organization: command.organizationId,
        _environment: command.environmentId,
        _subscriber: command.job?._subscriberId,
        provider: command.job?.providerId,
        delay: command.job?.delay,
        jobType: command.job?.type,
        digestType: digest?.type,
        digestEventsCount: digest?.events?.length,
        digestUnit: digest && 'unit' in digest ? digest.unit : undefined,
        digestAmount: digest && 'amount' in digest ? digest.amount : undefined,
        digestBackoff: digest?.type === DigestTypeEnum.BACKOFF || (digest as IDigestRegularMetadata)?.backoff === true,
        ...timedInfo,
        filterPassed: shouldRun,
        preferencesPassed: preferred,
        ...(usedFilters || {}),
        source: command.payload.__source || 'api',
      });
    }

    if (!shouldRun.passed || !preferred) {
      await this.jobRepository.updateStatus(command.environmentId, command.jobId, JobStatusEnum.CANCELED);

      return;
    }

    if (stepType !== StepTypeEnum.DELAY) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: stepType === StepTypeEnum.DIGEST ? DetailEnum.START_DIGESTING : DetailEnum.START_SENDING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }

    switch (stepType) {
      case StepTypeEnum.SMS:
        return await this.sendMessageSms.execute(command);
      case StepTypeEnum.IN_APP:
        return await this.sendMessageInApp.execute(command);
      case StepTypeEnum.EMAIL:
        return await this.sendMessageEmail.execute(command);
      case StepTypeEnum.CHAT:
        return await this.sendMessageChat.execute(command);
      case StepTypeEnum.PUSH:
        return await this.sendMessagePush.execute(command);
      case StepTypeEnum.DIGEST:
        return await this.digest.execute(command);
      case StepTypeEnum.DELAY:
        return await this.sendMessageDelay.execute(command);
    }
  }

  private async filter(command: SendMessageCommand) {
    const data = await this.getFilterData(command);

    const shouldRun = await this.matchMessage.filter(command, data);

    if (!shouldRun.passed) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.FILTER_STEPS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            payload: data,
            filters: command.step.filters,
          }),
        })
      );
    }

    return shouldRun;
  }

  @Instrument()
  private async getFilterData(command: SendMessageCommand) {
    const subscriberFilterExist = command.step?.filters?.find((filter) => {
      return filter?.children?.find((item) => item?.on === 'subscriber');
    });

    let subscriber;

    if (subscriberFilterExist) {
      subscriber = await this.getSubscriberBySubscriberId({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      });
    }

    return {
      subscriber,
      payload: command.payload,
    };
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async getSubscriberBySubscriberId({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }) {
    return await this.subscriberRepository.findOne({
      _environmentId,
      subscriberId,
    });
  }

  @Instrument()
  private async filterPreferredChannels(job: JobEntity): Promise<boolean> {
    const template = await this.getNotificationTemplate({
      _id: job._templateId,
      environmentId: job._environmentId,
    });
    if (!template) {
      throw new PlatformException(`Notification template ${job._templateId} is not found`);
    }

    if (template.critical || this.isActionStep(job)) {
      return true;
    }

    const subscriber = await this.getSubscriberBySubscriberId({
      _environmentId: job._environmentId,
      subscriberId: job.subscriberId,
    });
    if (!subscriber) throw new PlatformException('Subscriber not found with id ' + job._subscriberId);

    const buildCommand = GetSubscriberTemplatePreferenceCommand.create({
      organizationId: job._organizationId,
      subscriberId: subscriber.subscriberId,
      environmentId: job._environmentId,
      template,
      subscriber,
    });

    const { preference } = await this.getSubscriberTemplatePreferenceUsecase.execute(buildCommand);

    const result = this.stepPreferred(preference, job);

    if (!result) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_FILTERED_BY_PREFERENCES,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(preference),
        })
      );
    }

    return result;
  }

  @CachedEntity({
    builder: (command: { _id: string; environmentId: string }) =>
      buildNotificationTemplateKey({
        _environmentId: command.environmentId,
        _id: command._id,
      }),
  })
  private async getNotificationTemplate({ _id, environmentId }: { _id: string; environmentId: string }) {
    return await this.notificationTemplateRepository.findById(_id, environmentId);
  }

  @Instrument()
  private stepPreferred(preference: { enabled: boolean; channels: IPreferenceChannels }, job: JobEntity) {
    const templatePreferred = preference.enabled;

    const channelPreferred = Object.keys(preference.channels).some(
      (channelKey) => channelKey === job.type && preference.channels[job.type]
    );

    return templatePreferred && channelPreferred;
  }

  private isActionStep(job: JobEntity) {
    const channels = [StepTypeEnum.IN_APP, StepTypeEnum.EMAIL, StepTypeEnum.SMS, StepTypeEnum.PUSH, StepTypeEnum.CHAT];

    return !channels.find((channel) => channel === job.type);
  }
}
